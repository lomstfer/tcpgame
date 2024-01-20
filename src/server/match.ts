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

    private unitsGridPositionsToData = new Map<string, Unit>()

    private unitsUpdated = new Array<Unit>()

    dateTimeStarted: number

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
    }

    handleMessage(bytes: Uint8Array, messageId: MSG.MessageId, clientId: string) {
        switch (messageId) {
            case MSG.MessageId.clientMatchSpawnUnit: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientSpawnUnitRequest>(bytes)
                if (msgObj == undefined) {
                    break
                }
                this.spawnUnit(clientId, msgObj.position)
                break
            }
            case MSG.MessageId.clientMatchMoveUnits: {
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientMoveUnits>(bytes)
                if (msgObj == undefined) {
                    break
                }
                this.moveUnits(msgObj.unitIds, msgObj.position)
                this.sendUnitsUpdate()
                break
            }
        }
    }

    getMatchTime(): number {
        return Date.now() - this.dateTimeStarted
    }

    simulate(deltaTime: number) {
        for (const u of this.client1Units.values()) {
            SIMULATION.moveUnit(u)
        }

        console.log(this.getMatchTime())

        for (const u of this.client2Units.values()) {
            SIMULATION.moveUnit(u)
        }
    }

    sendUnitsUpdate() {
        const units = this.consumeAlreadyUpdatedUnits()
        if (units.length == 0) {
            return
        }

        const delay = this.getInputDelay()
        // console.log("delay:", delay)
        const matchTime = this.getMatchTime()
        const obj = new MSGOBJS.ServerUnitsUpdate(matchTime, units, matchTime + delay)
        const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverUnitsUpdate, obj)
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
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

    spawnUnit(ownerId: string, position: Vec2) {
        const gridPos = UTILS.roundWorldPositionToGrid(position)
        const gridPosString = JSON.stringify(gridPos)
        const occupyingUnit = this.unitsGridPositionsToData.get(gridPosString)
        if (occupyingUnit != undefined) {
            return
            /* const diff = Vec2.sub(position, occupyingUnit.position)
            if (Vec2.squareLengthOf(diff) == 0) {
                unit.position = Vec2.sub(occupyingUnit.position, Vec2.randomDirection(CONSTS.UNIT_SIZE))
            } */
        }

        const unit = new Unit(SUTILS.generateRandomID(), gridPos)
        this.unitsGridPositionsToData.set(gridPosString, unit)

        const selfBytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverSpawnUnitSelf, new MSGOBJS.ServerSpawnUnitSelf(unit))
        const otherBytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverSpawnUnitOther, new MSGOBJS.ServerSpawnUnitOther(unit))

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

                for (const [key, value] of this.unitsGridPositionsToData) {
                    if (value == unit) {
                        this.unitsGridPositionsToData.delete(key)
                    }
                }
            }
        }
        averagePosition = Vec2.divide(averagePosition, units.length)

        for (const [i, unit] of units.entries()) {
            const updatedUnit = lodash.cloneDeep(unit)

            let moveTo = Vec2.add(new Vec2(here.x, here.y), Vec2.sub(updatedUnit.position, averagePosition))
            moveTo = UTILS.roundWorldPositionToGrid(moveTo)
            if (this.gridPositionOccupied(moveTo)) {
                continue
            }
            
            updatedUnit.movingTo = moveTo
            this.unitsUpdated.push(updatedUnit)
            
            const roundedPositionString = JSON.stringify(UTILS.roundWorldPositionToGrid(updatedUnit.movingTo))
            this.unitsGridPositionsToData.set(roundedPositionString, unit)
            
            const delay = this.getInputDelay();
            (new NanoTimer()).setTimeout(() => {
                unit.movingTo = moveTo
            }, "", delay.toString() + "m")
        }
    }

    getUnitsFromIds(ids: string[]) {

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

    /* getRoundedUnitPosition(position: Vec2): Vec2 {
        const s = CONSTS.UNIT_SIZE
        const rounded = new Vec2(Math.round(position.x / s) * s, Math.round(position.y / s) * s)
        return rounded
    } */

    gridPositionOccupied(position: Vec2): boolean {
        const has = this.unitsGridPositionsToData.has(JSON.stringify(position))
        return has
    }
}