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

    client1UnitsToPlace = 0
    client2UnitsToPlace = 0

    private timeOfLastUnit = Date.now()

    private units1GridPositionsToData = new Map<string, Unit>()
    private units2GridPositionsToData = new Map<string, Unit>()
    private unitsGridPositionToOwner = new Map<string, /*clientid*/string>()

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
                if ((clientId == this.client1Socket.id && this.client1UnitsToPlace == 0) || 
                    (clientId == this.client2Socket.id && this.client2UnitsToPlace == 0)) {
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
                this.moveUnits(clientId, msgObj.unitIds, msgObj.position)
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
            if (SIMULATION.moveUnit(u)[0]) {
                this.onUnitArrived(this.client1Socket.id, u.position, u)
            }
        }

        for (const u of this.client2Units.values()) {
            if (SIMULATION.moveUnit(u)[0]) {
                this.onUnitArrived(this.client2Socket.id, u.position, u)
            }
        }

        if (Date.now() - this.timeOfLastUnit >= SCONSTS.CLIENT_GET_NEW_UNIT_TIME) {
            this.timeOfLastUnit = Date.now()
            this.client1UnitsToPlace += 1
            this.client2UnitsToPlace += 1
            console.log(this.unitsGridPositionToOwner)
        }
    }

    onUnitArrived(ownerOfArrivingId: string, position: Vec2, unit: Unit) {
        const p = JSON.stringify(position)
        if (this.unitsGridPositionToOwner.has(p)) {
            if (ownerOfArrivingId == this.client1Socket.id) {
                this.units1GridPositionsToData.set(p, unit)
                
                const deletedUnit = this.units2GridPositionsToData.get(p)
                if (deletedUnit != undefined) {
                    this.units2GridPositionsToData.delete(p)
                    this.client2Units.delete(deletedUnit.id)
                    sendDelete(deletedUnit.id, this.client1Socket.socket, this.client2Socket.socket)
                }
            }
            else {
                this.units2GridPositionsToData.set(p, unit)
                
                const deletedUnit = this.units1GridPositionsToData.get(p)
                if (deletedUnit != undefined) {
                    this.units1GridPositionsToData.delete(p)
                    this.client1Units.delete(deletedUnit.id)
                    sendDelete(deletedUnit.id, this.client1Socket.socket, this.client2Socket.socket)
                }
            }
        }
        this.unitsGridPositionToOwner.set(p, ownerOfArrivingId)

        function sendDelete(unitId: string, sock1: WebSocket, sock2: WebSocket) {
            const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverKillUnit, new MSGOBJS.ServerKillUnit(unitId))
            sock1.send(bytes)
            sock2.send(bytes)
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
        const occupyingUnit = this.units1GridPositionsToData.get(gridPosString) || this.units2GridPositionsToData.get(gridPosString)
        if (occupyingUnit != undefined) {
            return
            /* const diff = Vec2.sub(position, occupyingUnit.position)
            if (Vec2.squareLengthOf(diff) == 0) {
                unit.position = Vec2.sub(occupyingUnit.position, Vec2.randomDirection(CONSTS.UNIT_SIZE))
            } */
        }
        const gridPositions = ownerId == this.client1Socket.id ? this.units1GridPositionsToData : this.units2GridPositionsToData
        
        const unit = new Unit(SUTILS.generateRandomID(), gridPos)
        gridPositions.set(gridPosString, unit)
        this.unitsGridPositionToOwner.set(JSON.stringify(gridPos), ownerId)
        
        const selfBytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverSpawnUnitSelf, new MSGOBJS.ServerSpawnUnitSelf(unit))
        const otherBytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverSpawnUnitOther, new MSGOBJS.ServerSpawnUnitOther(unit))
        
        if (ownerId == this.client1Socket.id) {
            this.client1UnitsToPlace -= 1
            this.client1Units.set(unit.id, unit)
            this.client1Socket.socket.send(selfBytes)
            this.client2Socket.socket.send(otherBytes)
        }
        else if (ownerId == this.client2Socket.id) {
            this.client2UnitsToPlace -= 1
            this.client2Units.set(unit.id, unit)
            this.client2Socket.socket.send(selfBytes)
            this.client1Socket.socket.send(otherBytes)
        }
    }

    sendBytesToAll(bytes: Uint8Array) {
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    moveUnits(ownerId: string, unitIds: string[], here: Vec2) {
        const units: Unit[] = []
        // let averagePosition: Vec2 = new Vec2(0, 0)

        let clientUnits: Map<string, Unit>
        let selfUnitsGridPositions: Map<string, Unit>
        let otherUnitsGridPositions: Map<string, Unit>
        if (ownerId == this.client1Socket.id) {
            clientUnits = this.client1Units
            selfUnitsGridPositions = this.units1GridPositionsToData
            otherUnitsGridPositions = this.units2GridPositionsToData
        }
        else {
            clientUnits = this.client2Units
            selfUnitsGridPositions = this.units2GridPositionsToData
            otherUnitsGridPositions = this.units1GridPositionsToData
        }

        for (const id of unitIds) {
            const unit = clientUnits.get(id)
            if (unit != undefined) {
                units.push(unit)
                // averagePosition = Vec2.add(averagePosition, unit.position)

                for (const [key, u] of selfUnitsGridPositions) {
                    if (u == unit) {
                        selfUnitsGridPositions.delete(key)
                    }
                }
            }
        }

        const start = performance.now()
        for (const [i, unit] of units.entries()) {
            const updatedUnit = lodash.cloneDeep(unit)

            let moveTo = UTILS.roundWorldPositionToGrid(here)
            const step = CONSTS.GRID_SQUARE_SIZE

            const queue = [moveTo]
            const visitedOrWillBe = new Set<string>()
            while (queue.length > 0) {
                const current = queue.shift()
                if (current) {
                    moveTo = current
                }

                if (!this.gridPositionOccupied(moveTo, selfUnitsGridPositions)) {
                    break
                }

                const neighbors = [
                    new Vec2(moveTo.x + step, moveTo.y),
                    new Vec2(moveTo.x - step, moveTo.y),
                    new Vec2(moveTo.x, moveTo.y + step),
                    new Vec2(moveTo.x, moveTo.y - step)
                ]

                for (const n of neighbors) {
                    const ns = JSON.stringify(n)
                    if (!visitedOrWillBe.has(ns)) {
                        queue.push(n)
                        visitedOrWillBe.add(ns)
                    }
                }
            }

            const roundedPositionString = JSON.stringify(moveTo)
            selfUnitsGridPositions.set(roundedPositionString, unit)

            if (moveTo.x == updatedUnit.position.x && moveTo.y == updatedUnit.position.y) {
                continue
            }
            
            updatedUnit.movingTo = moveTo
            this.unitsUpdated.push(updatedUnit)
            
            if (this.gridPositionOccupied(moveTo, otherUnitsGridPositions)) {
                console.log("occcccccc")
            }
            
            const delay = this.getInputDelay();
            (new NanoTimer()).setTimeout(() => {
                const sp = JSON.stringify(unit.position)
                if (this.unitsGridPositionToOwner.get(sp) == ownerId) {
                    this.unitsGridPositionToOwner.delete(sp)
                }
                unit.movingTo = moveTo
            }, "", delay.toString() + "m")
        }
        console.log(performance.now() - start)
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

    gridPositionOccupied(position: Vec2, positions: Map<string, Unit>): boolean {
        const has = positions.has(JSON.stringify(position))
        return has
    }
}