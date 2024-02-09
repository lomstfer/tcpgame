import { Server } from "node:http"
import { WebSocketServer } from 'ws'
import { WebSocket } from 'ws'
import * as CONSTS from "../shared/constants.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import { Match } from "./match.js"
import { ClientInfo } from "../shared/clientInfo.js"
import { MatchData } from "../shared/matchData.js"
import NanoTimer from "nanotimer"
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

        newSock.on('message', (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageID = MSG.getMessageIdFromBytes(bytes)

            switch (messageID) {
                case MSG.MessageId.clientTimeRequest: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientTimeRequest>(bytes)
                    const answerObj = new MSGOBJS.ServerTimeAnswer(msgObj.clientTime, getElapsedTime())
                    const answerBytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverTimeAnswer, answerObj)
                    newSock.send(answerBytes)
                    break
                }
                case MSG.MessageId.clientPong: {
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientPong>(bytes)
                    sockets.get(clientId)?.handleClientPong(msgObj.sentFromServerTime, getElapsedTime())
                    break
                }
                case MSG.MessageId.clientEnterMatchFinder: {
                    console.log("clientEnterMatchFinder")
                    const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientEnterMatchFinder>(bytes)
                    if (msgObj == undefined) {
                        break
                    }
                    addClientToMatchFinder(clientId, msgObj.info, clientsInMatchFinder)
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
        worldIteration(ongoingMatches)
    }, "", CONSTS.WORLD_UPDATE_S.toString() + "s")

    const matchmakeTimer = new NanoTimer()
    matchmakeTimer.setInterval(() => {
        matchmakeIteration(sockets, clientsInMatchFinder, ongoingMatches, clientIdsToMatches)
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
    let bytes = MSG.getByteFromMessage(MSG.MessageId.serverConnectionAck)
    newSocket.send(bytes)
}

function sendPings(sockets: Map<string, SocketData>) {
    for (const s of sockets.values()) {
        const obj = new MSGOBJS.ServerPing(getElapsedTime())
        s.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.serverPing, obj))
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

function matchmakeIteration(
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
        const client1Team = Math.random() < 0.5
        const startUnits = m.spawnStartUnits(client1Team)

        const objTo1 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client2Info, getElapsedTime(), client1Team, startUnits[0], startUnits[1]))
        m.client1Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.serverFoundMatch, objTo1))
        const objTo2 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client1Info, getElapsedTime(), !client1Team, startUnits[1], startUnits[0]))
        m.client2Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.serverFoundMatch, objTo2))

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

        let newMatch = new Match(SUTILS.generateRandomID(), socket1, socket2, last[1], client)
        output.push(newMatch)

        clientsInMatchFinder.delete(last[0])
        clientsInMatchFinder.delete(idOfCurrent)

        i += 1
    }

    return output
}

function worldIteration(
    matches: Map<string, Match>,
) {
    for (const [id, match] of matches) {
        match.simulate(CONSTS.WORLD_UPDATE_S)
    }
}