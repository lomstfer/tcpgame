import { Server } from "node:http"
import { WebSocketServer } from 'ws'
import { WebSocket } from 'ws'
import * as CONSTS from "../shared/constants.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import { Vec2 } from "../shared/utils.js"
import { Match } from "./match.js"
import { ClientInfo } from "../shared/clientInfo.js"
import { WebSocketWithId } from "./match.js"
import { MatchData } from "../shared/matchData.js"
import { Unit } from "../shared/unit.js"
import NanoTimer from "nanotimer"
import * as SCONSTS from "./serverConstants.js"
import { SocketData } from "./socketData.js"

const startTime = Date.now()
function getElapsedTime() {
    return Date.now() - startTime
}

export function handleWS(server: Server) {
    const generalUpdateWait = 1 / 5
    const pingWait = 1

    const ws = new WebSocketServer({
        server: server
    })
    const sockets = new Map<string, SocketData>()
    const clientsInMatchFinder: Map<string, ClientInfo> = new Map<string, ClientInfo>()
    const ongoingMatches = new Map<string, Match>()
    const clientIdsToMatches = new Map<string, Match>()

    ws.on('connection', (newSock, r) => {
        console.log("connection")
        const clientId = SUTILS.generateRandomID();
        (newSock as any).id = clientId

        handleNewClient(newSock, sockets, clientId)

        newSock.on('error', console.error)

        newSock.on('message', async (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageID = MSG.getMessageIDFromBytes(bytes)

            switch (messageID) {
                case MSG.MessageID.clientTimeRequest: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientTimeRequest>(bytes)
                    const answerObj = new MSGOBJS.ServerTimeAnswer(msgObj.clientTime, getElapsedTime())
                    const answerBytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverTimeAnswer, answerObj)
                    newSock.send(answerBytes)
                    break
                }
                case MSG.MessageID.clientPong: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientPong>(bytes)
                    sockets.get(clientId)?.handleClientPong(msgObj.sentFromServerTime, getElapsedTime())
                    break
                }
                case MSG.MessageID.clientEnterMatchFinder: {
                    console.log("clientEnterMatchFinder")
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientEnterMatchFinder>(bytes)
                    if (msgObj == undefined) {
                        break
                    }
                    addClientToMatchFinder(clientId, msgObj.info, clientsInMatchFinder)
                    break
                }
                case MSG.MessageID.clientSpawnUnit: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientSpawnUnitRequest>(bytes)
                    if (msgObj == undefined) {
                        break
                    }
                    spawnUnitInMatch(msgObj.position, clientIdsToMatches, clientId)
                    break
                }
                case MSG.MessageID.clientMoveUnits: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientMoveUnits>(bytes)
                    if (msgObj == undefined) {
                        break
                    }

                    setUnitsOnTheMove(msgObj.unitIds, msgObj.position, clientIdsToMatches, clientId)
                    sendUnitUpdate(clientIdsToMatches.get(clientId))
                    break
                }
            }
        })

        newSock.on("close", () => {
            sockets.delete(clientId)
            clientsInMatchFinder.delete(clientId)

            const clientMatch = clientIdsToMatches.get(clientId)
            if (clientMatch != undefined) {
                clientMatch.disconnectClient(clientId)
                ongoingMatches.delete(clientMatch.id)
                clientIdsToMatches.delete(clientMatch.client1Socket.id)
                clientIdsToMatches.delete(clientMatch.client2Socket.id)
            }
            console.log("closed " + clientId)
        })
    })

    const worldTimer = new NanoTimer()
    worldTimer.setInterval(() => {
        worldUpdate(ongoingMatches)
    }, "", CONSTS.WORLD_UPDATE_S.toString() + "s")

    const matchmakeTimer = new NanoTimer()
    matchmakeTimer.setInterval(() => {
        matchmakeUpdate(sockets, clientsInMatchFinder, ongoingMatches, clientIdsToMatches)
    }, "", generalUpdateWait.toString() + "s")

    /* const sendTimer = new NanoTimer()
    sendTimer.setInterval(() => {
        sendUpdate(ongoingMatches)
    }, "", checkAndSendUpdateWait.toString() + "s") */

    const pingTimer = new NanoTimer()
    pingTimer.setInterval(() => {
        sendPings(sockets)
    }, "", pingWait.toString() + "s")
}

function handleNewClient(
    newSocket: WebSocket,
    sockets: Map<string, SocketData>,
    id: string
) {
    sockets.set(id, new SocketData(newSocket, id))
    let bytes = MSG.getByteFromMessage(MSG.MessageID.serverConnectionAck)
    newSocket.send(bytes)
}

function sendPings(sockets: Map<string, SocketData>) {
    for (const s of sockets.values()) {
        const obj = new MSGOBJS.ServerPing(getElapsedTime())
        s.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverPing, obj))
    }
}

function addClientToMatchFinder(
    clientId: string,
    clientInfo: ClientInfo,
    clientsInMatchFinder: Map<string, ClientInfo>,
) {
    if (clientsInMatchFinder.has(clientId)) {
        return
    }
    clientsInMatchFinder.set(clientId, clientInfo)
}

function matchmakeUpdate(
    sockets: Map<string, SocketData>,
    clientsInMatchFinder: Map<string, ClientInfo>,
    ongoingMatches: Map<string, Match>,
    clientIdsToMatches: Map<string, Match>
) {
    /* log() */
    if (clientsInMatchFinder.size < 2) {
        /* log() */
        return
    }

    let newMatches = consumeClientsFromMatchFinder(clientsInMatchFinder, sockets)

    for (let m of newMatches) {
        // m.ready()

        const timeNow = getElapsedTime()
        const objTo1 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client2Info, m.timeStarted, false))
        m.client1Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo1))
        const objTo2 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client1Info, m.timeStarted, true))
        m.client2Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo2))

        ongoingMatches.set(m.id, m)
        clientIdsToMatches.set(m.client1Socket.id, m)
        clientIdsToMatches.set(m.client2Socket.id, m)
    }

    function log() {
        console.clear()
        console.log("MATCH FINDER")
        for (const c of clientsInMatchFinder.values()) {
            console.log(c.name)
        }
        console.log("\n")
        console.log("ONGOING")
        for (const m of ongoingMatches.values()) {
            console.log(m.client1Info.name, m.client2Info.name)
        }
    }
}

function consumeClientsFromMatchFinder(
    clientsInMatchFinder: Map<string, ClientInfo>,
    sockets: Map<string, SocketData>
): Match[] {
    let output: Match[] = []

    let i = 0
    let last: [string, ClientInfo] | undefined = undefined
    for (const [idOfCurrent, client] of clientsInMatchFinder) {
        if (clientsInMatchFinder.size < 2) {
            break
        }
        if (i % 2 == 0) {
            last = [idOfCurrent, client]
            i += 1
            continue
        }
        if (last == undefined) {
            continue
        }

        const socket1 = sockets.get(last[0])
        const socket2 = sockets.get(idOfCurrent)
        if (socket1 == undefined || socket2 == undefined) {
            continue
        }

        let newMatch = new Match(SUTILS.generateRandomID(), getElapsedTime(), socket1, socket2, last[1], client)
        output.push(newMatch)

        clientsInMatchFinder.delete(last[0])
        clientsInMatchFinder.delete(idOfCurrent)

        i += 1
    }

    return output
}

function worldUpdate(
    matches: Map<string, Match>,
) {
    for (const [id, match] of matches) {
        match.simulate(CONSTS.WORLD_UPDATE_S)
    }
    // console.log(getElapsedTime())
    // await new Promise(r => setTimeout(r, CONSTS.WORLD_UPDATE_MS))
}

function sendUnitUpdate(
    match: Match | undefined,
) {
    if (match == undefined) {
        return
    }
    const units = match.consumeUpdatedUnits()
    if (units.length == 0) {
        return
    }

    const delay = match.getInputDelay()
    console.log("delay:", delay)
    const matchTime = match.getMatchTime(getElapsedTime())
    const obj = new MSGOBJS.ServerUnitsUpdate(matchTime, units, matchTime + delay)
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverUnitsUpdate, obj)
    match.client1Socket.socket.send(bytes)
    match.client2Socket.socket.send(bytes)
}

function spawnUnitInMatch(position: Vec2, clientIdsToMatches: Map<string, Match>, clientId: string) {
    const match = clientIdsToMatches.get(clientId)
    if (match != undefined) {
        match.spawnUnit(clientId, position)
    }
}

function setUnitsOnTheMove(unitIds: string[], toPosition: Vec2, clientIdsToMatches: Map<string, Match>, clientId: string) {
    const match = clientIdsToMatches.get(clientId)
    if (match == undefined) {
        return
    }
    unitIds.forEach(unitId => match.moveUnit(unitId, toPosition))
}