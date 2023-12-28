import { ClientInfo } from "../shared/clientInfo.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import mitt from "mitt" // events
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as UTILS from "../shared/utils.js"
import { Item } from "../shared/item.js"
import { MatchData } from "../shared/matchData.js"

type netEvents = {
    allowFindMatch: boolean,
    foundMatch: MatchData,
}

export const netEventEmitter = mitt<netEvents>()
export let selfInfo: ClientInfo | undefined = undefined

export function handleNetworking(ws: WebSocket) {
    let inMatch = false

    ws.onmessage = async function (e) {
        const arrbuf: ArrayBuffer = await e.data.arrayBuffer()
        const bytes = new Uint8Array(arrbuf)

        const messageID = MSG.getMessageIDFromBytes(bytes)

        switch (messageID) {
            case MSG.MessageID.serverConnectionAck: {
                netEventEmitter.emit("allowFindMatch", true)
                break
            }
            case MSG.MessageID.serverFoundMatch: {
                let obj = MSG.getObjectFromBytes<MSGOBJS.ServerFoundMatch>(bytes)
                inMatch = true
                console.log("found match")
                netEventEmitter.emit("foundMatch", obj.data)
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