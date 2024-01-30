import * as PIXI from "pixi.js"
import * as UTILS from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import { Vec2 } from "../shared/utils.js"
import { MatchData } from "../shared/matchData.js"
import { UnitSelection } from "./unitSelection.js"
import { Grid } from "./grid.js"
import mitt from "mitt" // events
import { KeyInput } from "./keyInput.js"
import { Unit } from "../shared/unit.js"
import { UnitRepresentation } from "./unitRepresentation.js"
import * as COLORS from "./colors.js"
import { Camera } from "./camera.js"
import * as SIMULATION from "../shared/simulation.js"
import { stateFilter } from "./shaders.js"

type gameEvents = {
    spawnUnitCommand: Vec2
    moveUnitsCommand: [Set<Unit>, Vec2]
}
export const gameEventEmitter = mitt<gameEvents>()

export class GameInstance {
    private appStage: PIXI.Container<PIXI.DisplayObject>

    private worldRoot: PIXI.Container
    private elapsedTime = 0

    private camera = new Camera()

    private mouseDown = false
    private mouseWorldPosition: Vec2 | undefined = undefined
    private mouseCanvasPosition: Vec2 | undefined = undefined

    private unitSelection: UnitSelection
    private grid = new Grid()

    private selfUnits = new Map<string, UnitRepresentation>()
    private otherUnits = new Map<string, UnitRepresentation>()
    // private selfUnitsUnconfirmed = new Array<UnitRepresentation>()
    private oldUnitsPositions = new Map<string, Vec2>()

    constructor(appStage: PIXI.Container<PIXI.DisplayObject>, matchData: MatchData) {
        if (matchData.team) {
            COLORS.setSelfColor(COLORS.PLAYER_1)
            COLORS.setOtherColor(COLORS.PLAYER_2)
        }
        else {
            COLORS.setSelfColor(COLORS.PLAYER_2)
            COLORS.setOtherColor(COLORS.PLAYER_1)
        }
        this.unitSelection = new UnitSelection()

        this.appStage = appStage

        this.worldRoot = new PIXI.Container()
        {
            this.worldRoot.x = CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = CONSTS.GAME_HEIGHT / 2
            this.worldRoot.sortableChildren = true
            this.appStage.addChild(this.worldRoot)
        }

        const origo = new PIXI.Graphics()
        origo.beginFill(0x000000)
        origo.drawCircle(0, 0, 5)
        origo.endFill()
        this.worldRoot.addChild(origo)

        this.worldRoot.addChild(this.grid.sprite)
        this.worldRoot.addChild(this.unitSelection.sprite)

        this.appStage.addEventListener("mousedown", e => {
            this.mouseDown = true
            this.mouseWorldPosition = this.camera.getMouseWorldPosition(e.client, this.appStage)
            this.mouseCanvasPosition = new Vec2(e.client.x, e.client.y)
            this.unitSelection.begin(this.mouseWorldPosition)
        })
        this.appStage.addEventListener("mouseup", e => {
            this.mouseDown = false
            this.unitSelection.end()
        })
        this.appStage.addEventListener("mousemove", e => {
            this.mouseWorldPosition = this.camera.getMouseWorldPosition(e.client, this.appStage)
            this.mouseCanvasPosition = new Vec2(e.client.x, e.client.y)
        })
        window.addEventListener("mouseout", () => {
            this.mouseCanvasPosition = undefined
            this.mouseWorldPosition = undefined
            this.mouseDown = false
        })

        /* {
        const inventorySlots = document.getElementById("inventory-slots")
        for (let i = 0; i < CONSTS.INVENTORY_SIZE; i++) {
            const slot = document.createElement("div")
            slot.classList.add("item-slot")
            slot.id = "item-slot-" + i.toString()
            inventorySlots?.appendChild(slot)
        }
        } */
    }

    stop() {
        if (this.worldRoot != undefined) {
            this.appStage.removeChild(this.worldRoot)
        }
    }

    update(deltaTime: number, time: number, keys: KeyInput) {
        this.camera.update(deltaTime, keys)
        if (this.mouseCanvasPosition) {
            this.mouseWorldPosition = this.camera.getMouseWorldPosition(this.mouseCanvasPosition, this.appStage)
        }

        this.grid.update(this.camera.worldPosition)

        this.unitSelection.update(this.mouseWorldPosition, this.mouseDown, this.selfUnits)
        if (this.mouseWorldPosition) {

            if (keys.keyPressed("KeyR")) {
                gameEventEmitter.emit("spawnUnitCommand", this.mouseWorldPosition)
                //this.spawnUnitSelfUnconfirmed(this.mouseWorldPosition)
            }

            if (keys.keyPressed("KeyF") && this.unitSelection.selectedUnits.size > 0) {
                gameEventEmitter.emit("moveUnitsCommand", [this.unitSelection.selectedUnits, this.mouseWorldPosition])
            }
        }

        if (this.worldRoot) {
            this.worldRoot.x = -this.camera.worldPosition.x + CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = -this.camera.worldPosition.y + CONSTS.GAME_HEIGHT / 2
        }

        stateFilter.uniforms.uTime = time / 1000
    }

    fixedUpdate() {
        this.moveUnits()
    }

    interpolate(alpha: number) {
        for (let [id, pos] of this.oldUnitsPositions) {
            const unit = this.selfUnits.get(id) || this.otherUnits.get(id)
            if (unit == undefined) {
                continue
            }
            unit.root.position.x = UTILS.Lerp(pos.x, unit.data.position.x, alpha)
            unit.root.position.y = UTILS.Lerp(pos.y, unit.data.position.y, alpha)
            unit.root.scale.x = unit.data.position.x - pos.x > 0 ? Math.abs(unit.root.scale.x) : unit.data.position.x - pos.x < 0 ? -Math.abs(unit.root.scale.x) : unit.root.scale.x
        }
    }

    private moveUnits() {
        for (const u of this.selfUnits.values()) {
            this.oldUnitsPositions.set(u.data.id, u.data.position)
            u.setMoving(SIMULATION.moveUnit(u.data)[1])
        }
        for (const u of this.otherUnits.values()) {
            this.oldUnitsPositions.set(u.data.id, u.data.position)
            u.setMoving(SIMULATION.moveUnit(u.data)[1])
        }
    }

    /* private spawnUnitSelfUnconfirmed(position: Vec2) {
        const unitR = new UnitRepresentation(new Unit("none", position), COLORS.SELF_COLOR)
        this.worldRoot.addChild(unitR.root)
        this.selfUnitsUnconfirmed.push(unitR)
    } */

    spawnUnitSelf(unit: Unit) {
        /* this.worldRoot.removeChild(this.selfUnitsUnconfirmed[0].root)
        this.selfUnitsUnconfirmed.splice(0, 1) */
        const unitR = new UnitRepresentation(unit, COLORS.SELF_COLOR)
        this.worldRoot.addChild(unitR.root)
        this.selfUnits.set(unitR.data.id, unitR)
    }

    spawnUnitOther(unit: Unit) {
        const unitR = new UnitRepresentation(unit, COLORS.OTHER_COLOR)
        this.worldRoot.addChild(unitR.root)
        this.otherUnits.set(unitR.data.id, unitR)
    }

    handleServerUpdate(timeSinceSent: number, units: Unit[], timeUntilExecute: number) {
        console.log("exe:", timeUntilExecute)
        for (const updatedUnit of units) {
            if (updatedUnit.movingTo == undefined) {
                console.log("updatedUnit.movingTo == undefined   (WHAT)")
                continue
            }
            const unit = this.selfUnits.get(updatedUnit.id) || this.otherUnits.get(updatedUnit.id)
            if (unit == undefined) {
                continue
            }

            if (timeUntilExecute < 0) {
                const timeIntoMove = -timeUntilExecute
                const totalDistance = Vec2.lengthOf(Vec2.sub(updatedUnit.position, updatedUnit.movingTo))
                const distanceIntoMove = timeIntoMove * 0.001 * CONSTS.UNIT_SPEED
                const ratio = distanceIntoMove / totalDistance
                unit.data.position = Vec2.lerp(updatedUnit.position, updatedUnit.movingTo, ratio)
                unit.data.movingTo = updatedUnit.movingTo
            }
        }
        if (timeUntilExecute >= 0) {
            setTimeout(() => { this.enforceServerUpdate(units, timeSinceSent + timeUntilExecute) }, timeUntilExecute)
        }
    }

    timeSinceLastUpdate: number | undefined
    lastUpdateTime: number | undefined
    private enforceServerUpdate(units: Unit[], timeSinceSent: number) {
        if (this.lastUpdateTime) {
            this.timeSinceLastUpdate = Date.now() - this.lastUpdateTime
        }
        this.lastUpdateTime = Date.now()

        for (const updatedUnit of units) {
            const unit = this.selfUnits.get(updatedUnit.id) || this.otherUnits.get(updatedUnit.id)
            if (unit != undefined) {
                /* if (unit.data.movingTo != undefined &&
                    ((this.timeSinceLastUpdate && this.timeSinceLastUpdate > timeSinceSent) || !this.timeSinceLastUpdate)
                ) {
                    // take into account that the updated data is old
                    const direction = Vec2.normalize(Vec2.sub(unit.data.movingTo, updatedUnit.position))
                    const distance = Vec2.multiply(direction, timeSinceSent * 0.001 * CONSTS.UNIT_SPEED)
                    const prediction = Vec2.add(updatedUnit.position, distance)

                    const diff = Vec2.squareLengthOf(Vec2.sub(unit.data.position, prediction))
                    if (diff > 10 * 10) {
                        unit.data.position = prediction
                        console.log("DIFF CORRECTION")
                    }
                } */

                unit.data.movingTo = updatedUnit.movingTo
            }
        }
    }

    killUnit(id: string) {
        const unit = this.selfUnits.get(id) || this.otherUnits.get(id)
        if (!unit) {
            return
        }
        this.worldRoot.removeChild(unit.root)
        this.selfUnits.delete(id) || this.otherUnits.delete(id)
        this.oldUnitsPositions.delete(id)
    }
}