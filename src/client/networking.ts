import { ClientInfo } from "../shared/clientInfo.js"
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import mitt from "mitt" // events
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as UTILS from "../shared/utils.js"
import { MatchData } from "../shared/matchData.js"
import { ServerTimeSyncer } from "./serverTimeSyncer.js"
import { Unit } from "../shared/unit.js"

type netEvents = {
    allowFindMatch: boolean,
    foundMatch: MatchData,
    matchWon: undefined,
    spawnServerUnitSelf: Unit
    spawnServerUnitOther: Unit,
    serverUnitsUpdate: [number, Unit[], number]
}

export const netEventEmitter = mitt<netEvents>()

const serverTimeSyncer = new ServerTimeSyncer()
let currentMatchData: MatchData | undefined = undefined

export function handleNetworking(ws: WebSocket) {
    ws.onmessage = async function (e) {
        const arrbuf: ArrayBuffer = await e.data.arrayBuffer()
        const bytes = new Uint8Array(arrbuf)

        const messageID = MSG.getMessageIdFromBytes(bytes)

        switch (messageID) {
            case MSG.MessageId.serverConnectionAck: {
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
            case MSG.MessageId.serverPing: {
                const sentTime = MSG.getObjectFromBytes<MSGOBJS.ServerPing>(bytes).sentFromServerTime
                const obj = new MSGOBJS.ClientPong(sentTime)
                ws.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.clientPong, obj))
                console.log("time d:", serverTimeSyncer.getServerTime() - sentTime)
                break
            }
            case MSG.MessageId.serverTimeAnswer: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerTimeAnswer>(bytes)
                serverTimeSyncer.handleServerTimeUpdate(msgObj.clientTime, msgObj.serverTime)
                break
            }
            case MSG.MessageId.serverFoundMatch: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerFoundMatch>(bytes)
                currentMatchData = msgObj.data
                console.log("found match")
                
                netEventEmitter.emit("foundMatch", msgObj.data)
                break
            }
            case MSG.MessageId.serverOpponentDisconnected: {                
                netEventEmitter.emit("matchWon")
                break
            }
            case MSG.MessageId.serverSpawnUnitSelf: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerSpawnUnitSelf>(bytes)                
                netEventEmitter.emit("spawnServerUnitSelf", msgObj.unit)
                break
            }
            case MSG.MessageId.serverSpawnUnitOther: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerSpawnUnitOther>(bytes)                
                netEventEmitter.emit("spawnServerUnitOther", msgObj.unit)
                break
            }
            case MSG.MessageId.serverUnitsUpdate: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerUnitsUpdate>(bytes)
                const data: [number, Unit[], number] = [
                    getMatchTimeMS() - msgObj.timeSent, 
                    msgObj.units, 
                    msgObj.timeToUpdate - getMatchTimeMS()
                ]
                netEventEmitter.emit("serverUnitsUpdate", data)
                break
            }
        }
    }
}

export function findMatch(ws: WebSocket, name: string) {
    const msgObj = new MSGOBJS.ClientEnterMatchFinder(new ClientInfo(name))
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.clientEnterMatchFinder, msgObj)
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
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.clientTimeRequest, obj)
    ws.send(bytes)
}

export function sendSpawnUnit(ws: WebSocket, position: Vec2) {
    const obj = new MSGOBJS.ClientSpawnUnitRequest(position)
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.clientMatchSpawnUnit, obj)
    ws.send(bytes)
}

export function sendMoveUnits(ws: WebSocket, data: [Set<Unit>, Vec2]) {
    const ids = Array.from(data[0]).map(u => u.id)
    const obj = new MSGOBJS.ClientMoveUnits(ids, data[1])
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.clientMatchMoveUnits, obj)
    ws.send(bytes)
}