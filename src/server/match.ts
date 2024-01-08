import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"
import { Vec2 } from '../shared/utils.js'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as SIMULATION from "../shared/simulation.js"
import lodash, { round } from "lodash"
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
    private roundedUnitsPositions = new Map<string, Unit>()

    timeStarted: number

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
            
            /* const roundedPositionString = JSON.stringify(this.getRoundedUnitPosition(u.position))
            this.roundedUnitsPositions.set(roundedPositionString, u) */
        }

        for (const u of this.client2Units.values()) {
            SIMULATION.moveUnit(u)

            /* const roundedPositionString = JSON.stringify(this.getRoundedUnitPosition(u.position))
            this.roundedUnitsPositions.set(roundedPositionString, u) */
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

        const roundedPositionString = JSON.stringify(this.getRoundedUnitPosition(position))
        this.roundedUnitsPositions.set(roundedPositionString, unit)
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

        const start1 = performance.now()
        for (const unit of units) {
            for (const [key, value] of this.roundedUnitsPositions) {
                if (value == unit) {
                    this.roundedUnitsPositions.delete(key)
                }
            }

            const updatedUnit = lodash.cloneDeep(unit)
            // let moveTo = Vec2.add(new Vec2(here.x, here.y), Vec2.sub(updatedUnit.position, averagePosition))
            let moveTo = new Vec2(here.x, here.y)
            if (this.alreadyHasRoundedUnitPosition(moveTo)) {
                moveTo = Vec2.sub(moveTo, Vec2.randomDirection(CONSTS.UNIT_SIZE))
            }
            
            updatedUnit.movingTo = moveTo
            this.unitsUpdated.push(updatedUnit)
            
            const roundedPositionString = JSON.stringify(this.getRoundedUnitPosition(updatedUnit.movingTo))
            this.roundedUnitsPositions.set(roundedPositionString, unit)
            
            const delay = this.getInputDelay();
            (new NanoTimer()).setTimeout(() => {
                unit.movingTo = moveTo
            }, "", delay.toString() + "m")
        }
        console.log(performance.now() - start1)
        
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

    getRoundedUnitPosition(position: Vec2): Vec2 {
        const s = CONSTS.UNIT_SIZE
        const rounded = new Vec2(Math.round(position.x / s) * s, Math.round(position.y / s) * s)
        return rounded
    }

    alreadyHasRoundedUnitPosition(position: Vec2): boolean {
        const rounded = this.getRoundedUnitPosition(position)
        const has = this.roundedUnitsPositions.has(JSON.stringify(rounded))
        return has
    }
}