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
    sendDeleteUnit: string /*unitId*/,
    sendSpawnUnit: [Uint8Array, Uint8Array] /*client1, client2*/
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

    private unitsUpdated = new Array<Unit>()

    constructor(client1Id: string, client2Id: string) {
        this.client1Id = client1Id
        this.client2Id = client2Id

        ;(new NanoTimer()).setInterval(() => {
            this.client1UnitsRemaining += 1
            this.client2UnitsRemaining += 1
        }, "", CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS + "m")

        ;(new NanoTimer()).setInterval(() => {
            this.client1MovesRemaining += 1
            this.client2MovesRemaining += 1
        }, "", CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS + "m")
    }

    simulate() {
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
                }
            }
            else {
                this.units2GridPositionsToData.set(p, unit)

                const deletedUnit = this.units1GridPositionsToData.get(p)
                if (deletedUnit != undefined) {
                    this.units1GridPositionsToData.delete(p)
                    this.client1Units.delete(deletedUnit.id)
                    this.unitsEventEmitter.emit("sendDeleteUnit", deletedUnit.id)
                }
            }
        }
        this.unitsGridPositionToOwner.set(p, ownerOfArrivingId)
    }

    trySpawnUnit(ownerId: string, position: Vec2, timeNow: number, delay: number) {
        if ((ownerId == this.client1Id && this.client1UnitsRemaining == 0) ||
            (ownerId == this.client2Id && this.client2UnitsRemaining == 0)) {
            return
        }

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
        const gridPositions = ownerId == this.client1Id ? this.units1GridPositionsToData : this.units2GridPositionsToData

        const unit = new Unit(SUTILS.generateRandomID(), gridPos)
        gridPositions.set(gridPosString, unit)
        this.unitsGridPositionToOwner.set(JSON.stringify(gridPos), ownerId)

        const selfBytes = MSG.getBytesFromMessageAndObj(
            MSG.MessageId.serverSpawnUnitSelf, 
            new MSGOBJS.ServerSpawnUnitSelf(unit, new MSGOBJS.CommandTimeData(timeNow, delay))
        )
        const otherBytes = MSG.getBytesFromMessageAndObj(
            MSG.MessageId.serverSpawnUnitOther, 
            new MSGOBJS.ServerSpawnUnitOther(unit, new MSGOBJS.CommandTimeData(timeNow, delay))
        )

        if (ownerId == this.client1Id) {
            this.client1UnitsRemaining -= 1
            this.client1Units.set(unit.id, unit)
            this.unitsEventEmitter.emit("sendSpawnUnit", [selfBytes, otherBytes])
        }
        else if (ownerId == this.client2Id) {
            this.client2UnitsRemaining -= 1
            this.client2Units.set(unit.id, unit)
            this.unitsEventEmitter.emit("sendSpawnUnit", [otherBytes, selfBytes])
        }
    }

    tryMoveUnits(ownerId: string, unitIds: string[], here: Vec2, inputDelay: number) {
        if ((ownerId == this.client1Id && this.client1MovesRemaining <= 0) ||
            (ownerId == this.client2Id && this.client2MovesRemaining <= 0)) {
            return
        }

        const units: Unit[] = []
        // let averagePosition: Vec2 = new Vec2(0, 0)

        let clientUnits: Map<string, Unit>
        let selfUnitsGridPositions: Map<string, Unit>
        let otherUnitsGridPositions: Map<string, Unit>
        if (ownerId == this.client1Id) {
            clientUnits = this.client1Units
            selfUnitsGridPositions = this.units1GridPositionsToData
            otherUnitsGridPositions = this.units2GridPositionsToData
            this.client1MovesRemaining -= 1
        }
        else {
            clientUnits = this.client2Units
            selfUnitsGridPositions = this.units2GridPositionsToData
            otherUnitsGridPositions = this.units1GridPositionsToData
            this.client2MovesRemaining -= 1
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
        for (const unit of units) {
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

            const delay = inputDelay;
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

    gridPositionOccupied(position: Vec2, positions: Map<string, Unit>): boolean {
        const has = positions.has(JSON.stringify(position))
        return has
    }
}