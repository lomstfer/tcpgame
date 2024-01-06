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
    private selfUnitsUnconfirmed = new Array<UnitRepresentation>()
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
                this.spawnUnitSelfUnconfirmed(this.mouseWorldPosition)
            }

            if (keys.keyPressed("KeyF") && this.unitSelection.selectedUnits.size > 0) {
                gameEventEmitter.emit("moveUnitsCommand", [this.unitSelection.selectedUnits, this.mouseWorldPosition])
            }
        }

        if (this.worldRoot) {
            this.worldRoot.x = -this.camera.worldPosition.x + CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = -this.camera.worldPosition.y + CONSTS.GAME_HEIGHT / 2
        }
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
            unit.body.position.x = UTILS.Lerp(pos.x, unit.data.position.x, alpha)
            unit.body.position.y = UTILS.Lerp(pos.y, unit.data.position.y, alpha)
        }
    }

    private moveUnits() {
        for (const u of this.selfUnits.values()) {
            this.oldUnitsPositions.set(u.data.id, u.data.position)
            SIMULATION.moveUnit(u.data)
        }
        for (const u of this.otherUnits.values()) {
            this.oldUnitsPositions.set(u.data.id, u.data.position)
            SIMULATION.moveUnit(u.data)
        }
    }

    private spawnUnitSelfUnconfirmed(position: Vec2) {
        const unitR = new UnitRepresentation(new Unit("none", position), COLORS.SELF_COLOR)

        this.worldRoot.addChild(unitR.body)

        this.selfUnitsUnconfirmed.push(unitR)
    }

    spawnUnitSelf(unit: Unit) {
        this.worldRoot.removeChild(this.selfUnitsUnconfirmed[0].body)
        this.selfUnitsUnconfirmed.splice(0, 1)

        const unitR = new UnitRepresentation(unit, COLORS.SELF_COLOR)

        this.worldRoot.addChild(unitR.body)

        this.selfUnits.set(unitR.data.id, unitR)
    }

    spawnUnitOther(unit: Unit) {
        const unitR = new UnitRepresentation(unit, COLORS.OTHER_COLOR)

        this.worldRoot.addChild(unitR.body)

        this.otherUnits.set(unitR.data.id, unitR)
    }

    handleServerUpdate(units: Unit[], timeUntilExecute: number) {
        console.log("exe:", timeUntilExecute)
        let doTimeout = true
        for (const updatedUnit of units) {
            if (updatedUnit.movingTo == undefined) {
                console.log("updatedUnit.movingTo == undefined   (WHAT)")
                continue
            }
            const unit = this.selfUnits.get(updatedUnit.id) || this.otherUnits.get(updatedUnit.id)
            if (unit == undefined) {
                continue
            }

            const diff = Vec2.squareLengthOf(Vec2.sub(unit.data.position, updatedUnit.position))
            if (diff > 10 * 10) {
                unit.data.position = updatedUnit.position
                console.log("DIFF CORRECTION")
            }

            if (timeUntilExecute < 0) {
                doTimeout = false
                const timeIntoMove = -timeUntilExecute
                const totalDistance = Vec2.lengthOf(Vec2.sub(updatedUnit.position, updatedUnit.movingTo))
                const distanceIntoMove = timeIntoMove * 0.001 * CONSTS.UNIT_SPEED
                const ratio = distanceIntoMove / totalDistance
                unit.data.position = Vec2.Lerp(updatedUnit.position, updatedUnit.movingTo, ratio)
                unit.data.movingTo = updatedUnit.movingTo
            }
        }
        if (doTimeout) {
            const now = Date.now()
            setTimeout(() => { this.enforceServerUpdate(units, now) }, timeUntilExecute)
        }
    }

    private enforceServerUpdate(units: Unit[], start: number) {
        for (const updatedUnit of units) {
            const unit = this.selfUnits.get(updatedUnit.id) || this.otherUnits.get(updatedUnit.id)
            if (unit != undefined) {
                unit.data.movingTo = updatedUnit.movingTo
            }
        }
    }
}