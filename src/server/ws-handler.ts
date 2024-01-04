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

const generalUpdateInterval = 1000 / 5

const startTime = Date.now()
function getElapsedTime() {
    return Date.now() - startTime
}

export function handleWS(server: Server) {
    let sockets = new Map<string, WebSocket>()
    let clientsInMatchFinder: Map<string, ClientInfo> = new Map<string, ClientInfo>()
    let ongoingMatches = new Map<string, Match>()
    let clientIdsToMatches = new Map<string, Match>()

    const ws = new WebSocketServer({
        server: server
    })

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
                    console.log(msgObj.unitIds)
                    setUnitsOnTheMove(msgObj.unitIds, msgObj.position, clientIdsToMatches, clientId)
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

    matchmakeLoop(sockets, clientsInMatchFinder, ongoingMatches, clientIdsToMatches)
    worldUpdateLoop(ongoingMatches)
    sendUpdateLoop(ongoingMatches)
}

function handleNewClient(
    newSocket: WebSocket,
    sockets: Map<string, WebSocket>,
    id: string
) {
    sockets.set(id, newSocket)
    let bytes = MSG.getByteFromMessage(MSG.MessageID.serverConnectionAck)
    newSocket.send(bytes)
}

/* const names = ["Arrow", "Echo", "Sage", "River", "Wren", "Orion", "Clover", "Atlas", "Ember", "Luna", "Phoenix", "Rowan", "Meadow", "Harbor", "Sterling", "Haven", "Ivy", "Thorne", "Ash", "Quinn"]
function getRandomName(): string {
    return names[Math.floor(Math.random() * (names.length - 1))]
} */

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

async function matchmakeLoop(
    sockets: Map<string, WebSocket>,
    clientsInMatchFinder: Map<string, ClientInfo>,
    ongoingMatches: Map<string, Match>,
    clientIdsToMatches: Map<string, Match>
) {
    while (true) {
        /* log() */
        while (clientsInMatchFinder.size < 2) {
            /* log() */
            await new Promise(r => setTimeout(r, generalUpdateInterval))
        }

        let newMatches = consumeClientsFromMatchFinder(clientsInMatchFinder, sockets)

        for (let m of newMatches) {
            // m.ready()

            const timeNow = getElapsedTime()
            const objTo1 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client2Info, timeNow, false))
            m.client1Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo1))
            const objTo2 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client1Info, timeNow, true))
            m.client2Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo2))

            ongoingMatches.set(m.id, m)
            clientIdsToMatches.set(m.client1Socket.id, m)
            clientIdsToMatches.set(m.client2Socket.id, m)
        }

        await new Promise(r => setTimeout(r, generalUpdateInterval))
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
    sockets: Map<string, WebSocket>
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

        let newMatch = new Match(SUTILS.generateRandomID(), new WebSocketWithId(socket1, last[0]), new WebSocketWithId(socket2, idOfCurrent), last[1], client)
        output.push(newMatch)

        clientsInMatchFinder.delete(last[0])
        clientsInMatchFinder.delete(idOfCurrent)

        i += 1
    }

    return output
}

async function worldUpdateLoop(
    matches: Map<string, Match>,
) {
    while (true) {
        for (const [id, match] of matches) {
            match.simulate(CONSTS.WORLD_UPDATE_S)
        }
        // console.log(getElapsedTime())
        await new Promise(r => setTimeout(r, CONSTS.WORLD_UPDATE_MS))
    }
}

async function sendUpdateLoop(
    matches: Map<string, Match>,
) {
    while (true) {
        for (const m of matches.values()) {
            const units = m.consumeUpdatedUnits()
            if (units.length == 0) {
                continue
            }
            const obj = new MSGOBJS.ServerUnitsUpdate(units)
            const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverUnitsUpdate, obj)
            m.client1Socket.socket.send(bytes)
            m.client2Socket.socket.send(bytes)
        }
        await new Promise(r => setTimeout(r, CONSTS.SERVER_SEND_MS))
    }
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