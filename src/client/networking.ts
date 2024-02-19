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
import { ExecuteDelayData } from "./executeDelayData.js"

type netEvents = {
    allowFindMatch: boolean,
    foundMatch: MatchData,
    opponentDisconnected: undefined,
    matchWon: undefined,
    matchLost: undefined,
    spawnServerUnitSelf: [ExecuteDelayData, Unit]
    spawnServerUnitOther: [ExecuteDelayData, Unit],
    serverUnitsUpdate: [ExecuteDelayData, Unit[]],
    killUnit: string,
    serverGameStateRespone: MSGOBJS.ServerGameStateResponse
}

export const TIME_SYNC_WAIT = 20
export const TIME_SYNCS_TO_DO = 2

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
                }, TIME_SYNC_WAIT)
                break
            }
            case MSG.MessageId.serverPing: {
                const sentTime = MSG.getObjectFromBytes<MSGOBJS.ServerPing>(bytes).sentFromServerTime
                const obj = new MSGOBJS.ClientPong(sentTime)
                ws.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.clientPong, obj))
                // console.log("time d:", serverTimeSyncer.getServerTime() - sentTime)
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
                
                netEventEmitter.emit("foundMatch", msgObj.data)
                break
            }
            case MSG.MessageId.serverOpponentDisconnected: {                
                netEventEmitter.emit("opponentDisconnected")
                break
            }
            case MSG.MessageId.serverSpawnUnitSelf: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerSpawnUnit>(bytes)  
                              
                netEventEmitter.emit("spawnServerUnitSelf", [
                    ExecuteDelayData.fromReceivedTimeData(getMatchTimeMS(), msgObj.timeData),
                    msgObj.unit
                ])
                break
            }
            case MSG.MessageId.serverSpawnUnitOther: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerSpawnUnit>(bytes)

                netEventEmitter.emit("spawnServerUnitOther", [
                    ExecuteDelayData.fromReceivedTimeData(getMatchTimeMS(), msgObj.timeData),
                    msgObj.unit
                ])
                break
            }
            case MSG.MessageId.serverUnitsUpdate: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerUnitsUpdate>(bytes)

                netEventEmitter.emit("serverUnitsUpdate", [
                    ExecuteDelayData.fromReceivedTimeData(getMatchTimeMS(), msgObj.timeData),
                    msgObj.units
                ])
                break
            }
            case MSG.MessageId.serverKillUnit: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerKillUnit>(bytes)
                netEventEmitter.emit("killUnit", msgObj.unitId)
                break
            }
            case MSG.MessageId.serverGameStateResponse: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ServerGameStateResponse>(bytes)
                netEventEmitter.emit("serverGameStateRespone", msgObj)
                break
            }
            case MSG.MessageId.serverYouWon: {
                netEventEmitter.emit("matchWon")
                break
            }
            case MSG.MessageId.serverYouLost: {
                netEventEmitter.emit("matchLost")
                break
            }
        }
    }

    ws.onclose = function(event) {
        console.log("-------------CLOSED-------------")
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

export function sendMoveUnits(ws: WebSocket, data: [Unit[], Vec2]) {
    const ids = Array.from(data[0]).map(u => u.id)
    const obj = new MSGOBJS.ClientMoveUnits(ids, data[1])
    const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.clientMatchMoveUnits, obj)
    ws.send(bytes)
}

export function sendGameStateRequest(ws: WebSocket) {
    ws.send(MSG.getByteFromMessage(MSG.MessageId.clientGameStateRequest))
}

export function sendRematchRequest(ws: WebSocket) {
    ws.send(MSG.getByteFromMessage(MSG.MessageId.clientRematch))
}

export function sendLeftMatch(ws: WebSocket) {
    ws.send(MSG.getByteFromMessage(MSG.MessageId.clientLeftMatch))
}