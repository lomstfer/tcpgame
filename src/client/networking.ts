import { ClientInfo } from "../shared/clientInfo.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import mitt from "mitt" // events
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as UTILS from "../shared/utils.js"
import { Item } from "../shared/item.js"
import { MatchData } from "../shared/matchData.js"
import { ServerTimeSyncer } from "./serverTimeSyncer.js"

type netEvents = {
    allowFindMatch: boolean,
    foundMatch: MatchData,
    matchWon: undefined,
    spawnServerUnit: Vec2
}

export const netEventEmitter = mitt<netEvents>()

const serverTimeSyncer = new ServerTimeSyncer()
let currentMatchData: MatchData | undefined = undefined

export function handleNetworking(ws: WebSocket) {
    ws.onmessage = async function (e) {
        const arrbuf: ArrayBuffer = await e.data.arrayBuffer()
        const bytes = new Uint8Array(arrbuf)

        const messageID = MSG.getMessageIDFromBytes(bytes)

        switch (messageID) {
            case MSG.MessageID.serverConnectionAck: {
                const timeSyncInterval = setInterval(() => {
                    if (serverTimeSyncer.timeSynced) {
                        clearInterval(timeSyncInterval)
                        netEventEmitter.emit("allowFindMatch", true)
                        return
                    }
                    sendServerTimeRequest(ws)
                }, 200)
                break
            }
            case MSG.MessageID.serverTimeAnswer: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerTimeAnswer>(bytes)
                serverTimeSyncer.handleServerTimeUpdate(msgObj.clientTime, msgObj.serverTime)
                break
            }
            case MSG.MessageID.serverFoundMatch: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerFoundMatch>(bytes)
                currentMatchData = msgObj.data
                console.log("found match")
                
                netEventEmitter.emit("foundMatch", msgObj.data)
                break
            }
            case MSG.MessageID.serverOpponentDisconnected: {                
                netEventEmitter.emit("matchWon")
                break
            }
            case MSG.MessageID.serverSpawnUnit: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerSpawnUnit>(bytes)                
                netEventEmitter.emit("spawnServerUnit", msgObj.position)
                break
            }
        }
    }
}

export function findMatch(ws: WebSocket, name: string) {
    const msgObj = new MSGOBJS.ClientEnterMatchFinder(new ClientInfo(name))
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.clientEnterMatchFinder, msgObj)
    ws.send(bytes)
    netEventEmitter.emit("allowFindMatch", false)
}

export function getServerTime(): number {
    return serverTimeSyncer.getServerTime()
}

export function getMatchTimeMS(): number {
    if (currentMatchData) {
        return serverTimeSyncer.getServerTime() - currentMatchData.timeStarted
    }
    return 0
}

function sendServerTimeRequest(ws: WebSocket) {
    const obj = new MSGOBJS.ClientTimeRequest(Date.now())
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.clientTimeRequest, obj)
    ws.send(bytes)
}

export function sendSpawnUnit(ws: WebSocket, position: Vec2) {
    const obj = new MSGOBJS.ClientSpawnUnit(position)
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.clientSpawnUnit, obj)
    ws.send(bytes)
}