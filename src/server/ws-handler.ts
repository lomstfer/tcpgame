import { Server } from "node:http"
import { WebSocketServer } from 'ws'
import { WebSocket } from 'ws'
import * as CONSTS from "../shared/constants.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import { Vec2 } from "../shared/utils.js"
import { Match } from "./match.js"
import { ClientInfo } from "../shared/clientInfo.js"
import { WebSocketWithId } from "./match.js"
import { MatchData } from "../shared/matchData.js"

const generalUpdateInterval = 1000 / 5

const startTime = Date.now()
function getElapsedTime() {
    return Date.now() - startTime
}

export function handleWS(server: Server) {
    let sockets = new Map<string, WebSocket>()
    let clientsInMatchFinder: Map<string, ClientInfo> = new Map<string, ClientInfo>()
    let ongoingMatches = new Map<string, Match>()

    const ws = new WebSocketServer({
        server: server
    })

    ws.on('connection', (newSock, r) => {
        console.log("connection")

        handleNewClient(newSock, sockets)

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
                    addClientToMatchFinder((newSock as any).id, msgObj.info, clientsInMatchFinder)
                    break
                }
            }
        })

        newSock.on("close", () => {
            const id: string = (newSock as any).id

            sockets.delete(id)
            clientsInMatchFinder.delete(id)

            const clientMatch = isClientInMatch(id, ongoingMatches)
            if (clientMatch != undefined) {
                handleClientLeftMatch(id, clientMatch, ongoingMatches)
            }
            console.log("closed " + id)
        })
    })

    matchmakeLoop(sockets, clientsInMatchFinder, ongoingMatches)
    worldUpdateLoop(ongoingMatches)
    sendUpdateLoop()
}

function handleNewClient(
    newSocket: WebSocket,
    sockets: Map<string, WebSocket>,
) {
    let id = generateRandomID();
    (newSocket as any).id = id
    sockets.set(id, newSocket)

    let bytes = MSG.getByteFromMessage(MSG.MessageID.serverConnectionAck)
    newSocket.send(bytes)
}

function generateRandomID(): string {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    }
    return s4() + s4() + s4()
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
    ongoingMatches: Map<string, Match>
) {
    while (true) {
        /* log() */
        while (clientsInMatchFinder.size < 2) {
            /* log() */
            await new Promise(r => setTimeout(r, generalUpdateInterval))
        }

        let newMatches = consumeClientsFromMatchFinder(clientsInMatchFinder, sockets)

        for (let m of newMatches) {
            m.ready()
            
            const timeNow = getElapsedTime()
            const objTo1 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client2Info, timeNow))
            m.client1Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo1))
            const objTo2 = new MSGOBJS.ServerFoundMatch(new MatchData(m.client1Info, timeNow))
            m.client2Socket.socket.send(MSG.getBytesFromMessageAndObj(MSG.MessageID.serverFoundMatch, objTo2))

            ongoingMatches.set(m.id, m)
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

        let newMatch = new Match(generateRandomID(), new WebSocketWithId(socket1, last[0]), new WebSocketWithId(socket2, idOfCurrent), last[1], client)
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
            match.simulate(CONSTS.WORLD_UPDATE_MS)
        }
        console.log(getElapsedTime())
        await new Promise(r => setTimeout(r, CONSTS.WORLD_UPDATE_MS))
    }
}

async function sendUpdateLoop(
) {
    while (true) {

        await new Promise(r => setTimeout(r, CONSTS.SERVER_SEND_MS))
    }
}

function isClientInMatch(clientId: string, ongoingMatches: Map<string, Match>): Match | undefined {
    for (const [matchId, match] of ongoingMatches) {
        if (match.client1Socket.id == clientId || match.client2Socket.id == clientId) {
            return match
        }
    }
    return undefined
}

function handleClientLeftMatch(
    clientId: string,
    match: Match,
    ongoingMatches: Map<string, Match>
) {
    match.disconnectClient(clientId)
    ongoingMatches.delete(match.id)
}