import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"
import { Vec2 } from '../shared/utils.js'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import * as UTILS from "../shared/utils.js"
import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as SIMULATION from "../shared/simulation.js"
import lodash, { round } from "lodash"
import * as SCONSTS from "./serverConstants.js"
import { SocketData } from './socketData.js'
import NanoTimer from 'nanotimer'
import { UnitHandler } from './unitHandler.js'

export class WebSocketWithId {
    socket: WebSocket
    id: string
    constructor(socket: WebSocket, id: string) {
        this.socket = socket
        this.id = id
    }
}

export class Match {
    id: string

    client1Socket: SocketData
    client2Socket: SocketData
    client1Info: ClientInfo
    client2Info: ClientInfo

    dateTimeStarted: number

    unitHandler: UnitHandler

    constructor(id: string, client1Socket: SocketData, client2Socket: SocketData, client1Info: ClientInfo, client2Info: ClientInfo) {
        this.id = id
        this.dateTimeStarted = Date.now()

        this.client1Socket = client1Socket
        this.client2Socket = client2Socket
        this.client1Info = client1Info
        this.client2Info = client2Info

        this.client1Socket.socket.on('message', (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageId = MSG.getMessageIdFromBytes(bytes)
            this.handleMessage(bytes, messageId, this.client1Socket.id)
        })
        this.client2Socket.socket.on('message', (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageId = MSG.getMessageIdFromBytes(bytes)
            this.handleMessage(bytes, messageId, this.client2Socket.id)
        })

        this.unitHandler = new UnitHandler(this.client1Socket.id, this.client2Socket.id)
        this.unitHandler.unitsEventEmitter.on("sendDeleteUnit", (id) => {
            this.sendDeleteUnit(id)
        })
        this.unitHandler.unitsEventEmitter.on("sendSpawnUnit", (bytes) => {
            this.client1Socket.socket.send(bytes[0])
            this.client2Socket.socket.send(bytes[1])
        })
    }

    handleMessage(bytes: Uint8Array, messageId: MSG.MessageId, clientId: string) {
        switch (messageId) {
            case MSG.MessageId.clientMatchSpawnUnit: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientSpawnUnitRequest>(bytes)
                if (msgObj == undefined) {
                    break
                }
                
                this.unitHandler.trySpawnUnit(clientId, msgObj.position, this.getMatchTime(), this.getInputDelay())
                break
            }
            case MSG.MessageId.clientMatchMoveUnits: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientMoveUnits>(bytes)
                if (msgObj == undefined) {
                    break
                }
                this.unitHandler.tryMoveUnits(clientId, msgObj.unitIds, msgObj.position, this.getInputDelay())
                this.sendUnitsUpdate()
                break
            }
        }
    }

    getMatchTime(): number {
        return Date.now() - this.dateTimeStarted
    }

    simulate(deltaTime: number) {
        this.unitHandler.simulate()
    }

    disconnectClient(id: string) {
        if (id == this.client1Socket.id) {
            console.log(this.client1Info.name, "disconnected")
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverOpponentDisconnected))
        }
        else if (id == this.client2Socket.id) {
            console.log(this.client2Info.name, "disconnected")
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverOpponentDisconnected))
        }
    }

    sendBytesToAll(bytes: Uint8Array) {
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    sendUnitsUpdate() {
        const units = this.unitHandler.consumeAlreadyUpdatedUnits()
        if (units.length == 0) {
            return
        }

        const delay = this.getInputDelay()
        // console.log("delay:", delay)
        const matchTime = this.getMatchTime()
        const obj = new MSGOBJS.ServerUnitsUpdate(units, new MSGOBJS.CommandTimeData(matchTime, matchTime + delay))
        const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverUnitsUpdate, obj)
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    sendDeleteUnit(unitId: string) {
        const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverKillUnit, new MSGOBJS.ServerKillUnit(unitId))
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    getHighestPing(): number | undefined {
        if (this.client1Socket.ping == undefined || this.client2Socket.ping == undefined) {
            return
        }
        if (this.client1Socket.ping >= this.client2Socket.ping) {
            return this.client1Socket.ping
        }
        return this.client2Socket.ping
    }

    getHighestOneWayLatency(): number | undefined {
        const ping = this.getHighestPing()
        if (ping != undefined) {
            return ping / 2
        }
        return undefined
    }

    getInputDelay(): number {
        let delay = this.getHighestPing()
        if (delay == undefined || delay < SCONSTS.INPUT_DELAY_MINIMUM_MS) {
            return SCONSTS.INPUT_DELAY_MINIMUM_MS
        }
        return delay/* SCONSTS.INPUT_DELAY_MINIMUM_MS */
    }
}