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
}

export const netEventEmitter = mitt<netEvents>()

const serverTimeSyncer = new ServerTimeSyncer()

export function handleNetworking(ws: WebSocket) {
    let inMatch = false

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
                inMatch = true
                console.log("found match")
                
                netEventEmitter.emit("foundMatch", msgObj.data)
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

function sendServerTimeRequest(ws: WebSocket) {
    const obj = new MSGOBJS.ClientTimeRequest(Date.now())
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.clientTimeRequest, obj)
    ws.send(bytes)
}