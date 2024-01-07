import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"
import { Vec2 } from '../shared/utils.js'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as SIMULATION from "../shared/simulation.js"
import lodash from "lodash"
import * as SCONSTS from "./serverConstants.js"
import { SocketData } from './socketData.js'
import NanoTimer from 'nanotimer'

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

    client1Units = new Map<string, Unit>()
    client2Units = new Map<string, Unit>()

    private unitsUpdated = new Array<Unit>()

    timeStarted: number

    nanoTimer = new NanoTimer()

    constructor(id: string, timeStarted: number, client1Socket: SocketData, client2Socket: SocketData, client1Info: ClientInfo, client2Info: ClientInfo) {
        this.id = id
        this.timeStarted = timeStarted

        this.client1Socket = client1Socket
        this.client2Socket = client2Socket
        this.client1Info = client1Info
        this.client2Info = client2Info
    }

    getMatchTime(currentTime: number): number {
        return currentTime - this.timeStarted
    }

    simulate(deltaTime: number) {
        for (const u of this.client1Units.values()) {
            SIMULATION.moveUnit(u)
        }
        for (const u of this.client2Units.values()) {
            SIMULATION.moveUnit(u)
        }
    }

    disconnectClient(id: string) {
        if (id == this.client1Socket.id) {
            console.log(this.client1Info.name, "disconnected")
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageID.serverOpponentDisconnected))
        }
        else if (id == this.client2Socket.id) {
            console.log(this.client2Info.name, "disconnected")
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageID.serverOpponentDisconnected))
        }
    }

    spawnUnit(ownerId: string, position: Vec2) {
        const unit = new Unit(SUTILS.generateRandomID(), position)

        const selfBytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverSpawnUnitSelf, new MSGOBJS.ServerSpawnUnitSelf(unit))
        const otherBytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverSpawnUnitOther, new MSGOBJS.ServerSpawnUnitOther(unit))

        if (ownerId == this.client1Socket.id) {
            this.client1Units.set(unit.id, unit)
            this.client1Socket.socket.send(selfBytes)
            this.client2Socket.socket.send(otherBytes)
        }
        else if (ownerId == this.client2Socket.id) {
            this.client2Units.set(unit.id, unit)
            this.client2Socket.socket.send(selfBytes)
            this.client1Socket.socket.send(otherBytes)
        }
    }

    sendBytesToAll(bytes: Uint8Array) {
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    moveUnits(unitIds: string[], here: Vec2) {
        const units: Unit[] = []
        let averagePosition: Vec2 = new Vec2(0, 0)
        for (const id of unitIds) {
            const unit = this.client1Units.get(id) || this.client2Units.get(id)
            if (unit != undefined) {
                units.push(unit)
                averagePosition = Vec2.add(averagePosition, unit.position)
            }
        }
        averagePosition = Vec2.divide(averagePosition, units.length)

        for (const unit of units) {
            const updatedUnit = lodash.cloneDeep(unit)
            const moveTo = Vec2.add(new Vec2(here.x, here.y), Vec2.multiply(Vec2.sub(updatedUnit.position, averagePosition), 0.5))
            updatedUnit.movingTo = moveTo
            this.unitsUpdated.push(updatedUnit)
    
            const delay = this.getInputDelay()
    
            const start = Date.now();
            (new NanoTimer()).setTimeout(() => {
                console.log("now!", Date.now() - start)
                unit.movingTo = moveTo
            }, "", delay.toString() + "m")
        }

    }

    consumeAlreadyUpdatedUnits(): Unit[] {
        return this.unitsUpdated.splice(0, this.unitsUpdated.length)
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