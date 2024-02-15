import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as SCONSTS from "./serverConstants.js"
import * as SIMULATION from "../shared/simulation.js"
import { Vec2 } from '../shared/utils.js'
import NanoTimer from 'nanotimer'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import mitt from "mitt" // events
import * as UTILS from "../shared/utils.js"
import lodash from "lodash"
import * as SUTILS from "./serverUtils.js"

type unitsEvents = {
    sendDeleteUnit: string /* unitId */,
    clientNoUnitsAlive: string /* clientId  */,
}

export class UnitHandler {
    unitsEventEmitter = mitt<unitsEvents>()

    client1Id: string
    client2Id: string

    client1Units = new Map<string, Unit>()
    client2Units = new Map<string, Unit>()

    client1UnitsRemaining = 0
    client2UnitsRemaining = 0

    client1MovesRemaining = 0
    client2MovesRemaining = 0

    private units1GridPositionsToData = new Map<string, Unit>()
    private units2GridPositionsToData = new Map<string, Unit>()
    private unitsGridPositionToOwner = new Map<string, /*clientid*/string>()

    private unitsUpdatedToSend = new Array<Unit>()

    private unitsThatWillBeMoved = new Set<Unit>()

    private newUnitTime: number = 0
    private newMoveTime: number = 0
    private lastTime: number = performance.now()

    constructor(client1Id: string, client2Id: string) {
        this.client1Id = client1Id
        this.client2Id = client2Id
    }

    simulate() {
        const dt = performance.now() - this.lastTime
        this.newUnitTime += dt
        if (this.newUnitTime >= CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS) {
            this.client1UnitsRemaining += 1
            this.client2UnitsRemaining += 1
            this.newUnitTime -= CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS
        }
        this.newMoveTime += dt
        if (this.newMoveTime >= CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS) {
            this.client1MovesRemaining += 1
            this.client2MovesRemaining += 1
            this.newMoveTime -= CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS
        }

        this.lastTime = performance.now()

        for (const u of this.client1Units.values()) {
            if (SIMULATION.moveUnit(u, CONSTS.WORLD_UPDATE_S)[0]) {
                this.onUnitArrived(this.client1Id, u.position, u)
            }
        }

        for (const u of this.client2Units.values()) {
            if (SIMULATION.moveUnit(u, CONSTS.WORLD_UPDATE_S)[0]) {
                this.onUnitArrived(this.client2Id, u.position, u)
            }
        }
    }

    onUnitArrived(ownerOfArrivingId: string, position: Vec2, unit: Unit) {
        const p = JSON.stringify(position)
        if (this.unitsGridPositionToOwner.has(p)) {
            if (ownerOfArrivingId == this.client1Id) {
                this.units1GridPositionsToData.set(p, unit)

                const deletedUnit = this.units2GridPositionsToData.get(p)
                if (deletedUnit != undefined) {
                    this.units2GridPositionsToData.delete(p)
                    this.client2Units.delete(deletedUnit.id)
                    this.unitsEventEmitter.emit("sendDeleteUnit", deletedUnit.id)
                    if (this.client2Units.size <= 0) {
                        this.unitsEventEmitter.emit("clientNoUnitsAlive", this.client2Id)
                    }
                }
            }
            else {
                this.units2GridPositionsToData.set(p, unit)

                const deletedUnit = this.units1GridPositionsToData.get(p)
                if (deletedUnit != undefined) {
                    this.units1GridPositionsToData.delete(p)
                    this.client1Units.delete(deletedUnit.id)
                    this.unitsEventEmitter.emit("sendDeleteUnit", deletedUnit.id)
                    if (this.client1Units.size <= 0) {
                        this.unitsEventEmitter.emit("clientNoUnitsAlive", this.client1Id)
                    }
                }
            }
        }
        this.unitsGridPositionToOwner.set(p, ownerOfArrivingId)
    }

    trySpawnUnit(ownerId: string, position: Vec2, timeNow: number, delay: number): [Uint8Array, Uint8Array] | undefined {
        if ((ownerId == this.client1Id && this.client1UnitsRemaining <= 0) ||
            (ownerId == this.client2Id && this.client2UnitsRemaining <= 0)) {
            return undefined
        }

        position = Vec2.clampToWorld(position)

        const unit = this.spawnUnitForFree(ownerId, position)
        if (unit == undefined) {
            return undefined
        }

        const selfBytes = MSG.getBytesFromMessageAndObj(
            MSG.MessageId.serverSpawnUnitSelf,
            new MSGOBJS.ServerSpawnUnit(unit, new MSGOBJS.CommandTimeData(timeNow, timeNow + delay))
        )
        const otherBytes = MSG.getBytesFromMessageAndObj(
            MSG.MessageId.serverSpawnUnitOther,
            new MSGOBJS.ServerSpawnUnit(unit, new MSGOBJS.CommandTimeData(timeNow, timeNow + delay))
        )

        if (ownerId == this.client1Id) {
            this.client1UnitsRemaining -= 1
            return [selfBytes, otherBytes]
        }
        else if (ownerId == this.client2Id) {
            this.client2UnitsRemaining -= 1
            return [otherBytes, selfBytes]
        }

        return undefined
    }

    spawnUnitForFree(ownerId: string, position: Vec2): Unit | undefined {
        position = Vec2.clampToWorld(position)
        
        const gridPos = UTILS.roundWorldPositionToGrid(position)
        const gridPosString = JSON.stringify(gridPos)
        const occupyingUnit = this.units1GridPositionsToData.get(gridPosString) || this.units2GridPositionsToData.get(gridPosString)
        if (occupyingUnit != undefined) {
            return undefined
        }
        const gridPositions = ownerId == this.client1Id ? this.units1GridPositionsToData : this.units2GridPositionsToData

        const unit = new Unit(SUTILS.generateRandomID(), gridPos)
        gridPositions.set(gridPosString, unit)
        this.unitsGridPositionToOwner.set(JSON.stringify(gridPos), ownerId)

        if (ownerId == this.client1Id) {
            this.client1Units.set(unit.id, unit)
        }
        else if (ownerId == this.client2Id) {
            this.client2Units.set(unit.id, unit)
        }

        return unit
    }

    tryMoveUnits(ownerId: string, unitIds: string[], here: Vec2, inputDelay: number) {
        if ((ownerId == this.client1Id && this.client1MovesRemaining <= 0) ||
            (ownerId == this.client2Id && this.client2MovesRemaining <= 0)) {
            return
        }

        here = Vec2.clampToWorld(here)

        const units: Unit[] = []
        // let averagePosition: Vec2 = new Vec2(0, 0)

        let clientUnits: Map<string, Unit>
        let selfUnitsGridPositions: Map<string, Unit>
        if (ownerId == this.client1Id) {
            clientUnits = this.client1Units
            selfUnitsGridPositions = this.units1GridPositionsToData
        }
        else if (ownerId == this.client2Id) {
            clientUnits = this.client2Units
            selfUnitsGridPositions = this.units2GridPositionsToData
        }
        else {
            return
        }

        for (const id of unitIds) {
            const unit = clientUnits.get(id)
            if (unit != undefined) {
                units.push(unit)

                for (const [key, u] of selfUnitsGridPositions) {
                    if (u == unit) {
                        selfUnitsGridPositions.delete(key)
                    }
                }
            }
        }

        const unitsToUpdateAfterDelay: [Unit, newMoveTo: Vec2][] = []

        const start = performance.now()
        for (const unit of units) {
            if (performance.now() - start > 10) {
                return
            }

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

                let neighbors = [
                    new Vec2(moveTo.x + step, moveTo.y),
                    new Vec2(moveTo.x - step, moveTo.y),
                    new Vec2(moveTo.x, moveTo.y + step),
                    new Vec2(moveTo.x, moveTo.y - step)
                ]
                neighbors = neighbors.filter(v => v.x >= -CONSTS.WORLD_WIDTH/2 && v.x <= CONSTS.WORLD_WIDTH/2 &&
                                             v.y >= -CONSTS.WORLD_HEIGHT/2 && v.y <= CONSTS.WORLD_HEIGHT/2)

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

            if ((moveTo.x == unit.position.x && moveTo.y == unit.position.y)) {
                continue
            }
            if (unit.movingTo) {
                if (moveTo.x == unit.movingTo.x && moveTo.y == unit.movingTo.y) {
                    continue
                }
            }
            if (this.unitsThatWillBeMoved.has(unit)) {
                continue
            }

            unitsToUpdateAfterDelay.push([unit, moveTo])
            
            this.unitsThatWillBeMoved.add(unit)

            const updatedUnit = lodash.cloneDeep(unit)
            updatedUnit.movingTo = moveTo
            this.unitsUpdatedToSend.push(updatedUnit)
        }

        if (this.unitsUpdatedToSend.length == 0) {
            return
        }

        if (ownerId == this.client1Id) {
            this.client1MovesRemaining -= 1
        }
        else if (ownerId == this.client2Id) {
            this.client2MovesRemaining -= 1
        }

        ; (new NanoTimer()).setTimeout(() => {
            for (const [u, newMoveTo] of unitsToUpdateAfterDelay) {
                this.unitsThatWillBeMoved.delete(u)
                u.movingTo = new Vec2(newMoveTo.x, newMoveTo.y)
                const sp = JSON.stringify(u.position)
                if (this.unitsGridPositionToOwner.get(sp) == ownerId) {
                    this.unitsGridPositionToOwner.delete(sp)
                }
            }
        }, "", inputDelay.toString() + "m")

        // console.log(performance.now() - start)
    }

    consumeAlreadyUpdatedUnits(): Unit[] {
        return this.unitsUpdatedToSend.splice(0, this.unitsUpdatedToSend.length)
    }

    gridPositionOccupied(position: Vec2, positions: Map<string, Unit>): boolean {
        const has = positions.has(JSON.stringify(position))
        return has
    }

    getServerGameStateResponse(clientId: string) {
        let unitsToPlace: number = 0
        let movesLeft: number = 0
        
        if (clientId == this.client1Id) {
            unitsToPlace = this.client1UnitsRemaining
            movesLeft = this.client1MovesRemaining
        }
        else if (clientId == this.client2Id) {
            unitsToPlace = this.client2UnitsRemaining
            movesLeft = this.client2MovesRemaining
        }

        return {
            units: Array.from(this.client1Units.values()).concat(Array.from(this.client2Units.values())),
            unitsToPlace: unitsToPlace,
            movesLeft: movesLeft,
            unitsToPlaceTime: this.newUnitTime,
            movesLeftTime: this.newMoveTime
        }
    }
}