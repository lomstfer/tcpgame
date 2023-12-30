import * as PIXI from "pixi.js"
import * as GUTILS from "./gameUtils.js"
import * as UTILS from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as SHADERS from "./shaders.js"
import { Vec2 } from "../shared/utils.js"
import { MatchData } from "../shared/matchData.js"

export class MatchVisualizer {
    private worldRoot: PIXI.Container | undefined = undefined
    private elapsedTime = 0

    private cameraTargetPosition = new Vec2(0, 0)
    private cameraWorldPosition = new Vec2(0, 0)
    private cameraStiffness = 6
    private cameraSpeed = 200

    private moveToPosition: Vec2 | undefined = undefined
    private mousePosition = new Vec2(0, 0)
    private mouseDownPosition = new Vec2(0, 0)
    private mouseDown = false

    private grid: PIXI.Sprite
    private gridFilter: PIXI.Filter
    private lastGridPosition: Vec2 = new Vec2(0, 0)

    private unitSelection: PIXI.Sprite

    constructor() {
        this.grid = PIXI.Sprite.from('public/img/pixel.jpg')
        this.grid.width = CONSTS.GAME_WIDTH
        this.grid.height = CONSTS.GAME_HEIGHT
        this.grid.x = 0
        this.grid.y = 0

        this.gridFilter = new PIXI.Filter(undefined, SHADERS.gridFragShader)
        this.gridFilter.autoFit = false
        this.grid.filters = [this.gridFilter]
        this.gridFilter.uniforms.uSize = new PIXI.Point(this.grid.width, this.grid.height)
        this.gridFilter.uniforms.uWorldPosition = new PIXI.Point(this.grid.x, this.grid.y)

        this.unitSelection = PIXI.Sprite.from('public/img/pixel.jpg')
        this.unitSelection.width = 0
        this.unitSelection.height = 0
        this.unitSelection.x = 0
        this.unitSelection.y = 0
        this.unitSelection.tint = 0xFF0000
        this.unitSelection.alpha = 0.3
    }

    start(appStage: PIXI.Container<PIXI.DisplayObject>, matchData: MatchData) {
        /* {
        const inventorySlots = document.getElementById("inventory-slots")
        for (let i = 0; i < CONSTS.INVENTORY_SIZE; i++) {
            const slot = document.createElement("div")
            slot.classList.add("item-slot")
            slot.id = "item-slot-" + i.toString()
            inventorySlots?.appendChild(slot)
        }
        } */

        appStage.addEventListener("mousedown", e => {
            this.mouseDown = true
            const worldPos = GUTILS.getMouseWorldPosition(e.client, this.cameraWorldPosition, appStage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
            this.mouseDownPosition.x = worldPos.x
            this.mouseDownPosition.y = worldPos.y
            this.mousePosition = worldPos
            this.beginUnitSelection()
        })
        appStage.addEventListener("mouseup", e => {
            this.mouseDown = false
            this.endUnitSelection()
        })
        appStage.addEventListener("mousemove", e => {
            const worldPos = GUTILS.getMouseWorldPosition(e.client, this.cameraWorldPosition, appStage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
            this.mousePosition = worldPos
        })

        this.worldRoot = new PIXI.Container()
        {
            this.worldRoot.x = CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = CONSTS.GAME_HEIGHT / 2
            this.worldRoot.sortableChildren = true
            appStage.addChild(this.worldRoot)
        }

        this.worldRoot.addChild(this.grid)

        this.worldRoot.addChild(this.unitSelection)
    }

    stop(appStage: PIXI.Container<PIXI.DisplayObject>) {
        if (this.worldRoot) {
            appStage.removeChild(this.worldRoot)
        }
    }

    simulate() {

    }

    update(deltaTime: number, keys: Set<string>) {
        this.moveCamera(deltaTime, keys)
        this.updateUnitSelection()
        this.updateShaders(this.elapsedTime)
    }

    private updateShaders(time: number) {
        if (this.grid.x != this.lastGridPosition.x || this.grid.y != this.lastGridPosition.y) {
            this.gridFilter.uniforms.uWorldPosition = new PIXI.Point(this.grid.x, this.grid.y)
        }
        this.lastGridPosition = new Vec2(this.grid.x, this.grid.y)
    }

    private beginUnitSelection() {
        this.unitSelection.x = this.mouseDownPosition.x
        this.unitSelection.y = this.mouseDownPosition.y
        this.unitSelection.visible = true
    }

    private updateUnitSelection() {
        if (this.mouseDown) {
            let diff = new Vec2(this.mousePosition.x - this.mouseDownPosition.x, this.mousePosition.y - this.mouseDownPosition.y)
            if (diff.x < 0) {
                this.unitSelection.x = this.mousePosition.x
            }
            if (diff.y < 0) {
                this.unitSelection.y = this.mousePosition.y
            }
            this.unitSelection.width = Math.abs(diff.x)
            this.unitSelection.height = Math.abs(diff.y)
        }
    }

    private endUnitSelection() {
        this.unitSelection.visible = false
        this.unitSelection.width = 0
        this.unitSelection.height = 0
    }

    private moveCamera(deltaTime: number, keys: Set<string>) {
        this.elapsedTime += deltaTime

        let keyInput = new Vec2(0, 0)
        if (keys.has("KeyA")) {
            keyInput.x -= 1
        }
        if (keys.has("KeyD")) {
            keyInput.x += 1
        }
        if (keys.has("KeyW")) {
            keyInput.y -= 1
        }
        if (keys.has("KeyS")) {
            keyInput.y += 1
        }

        let input = new Vec2(0, 0)

        if (keyInput.x != 0 || keyInput.y != 0) {
            this.moveToPosition = undefined
            input.x = keyInput.x
            input.y = keyInput.y
        }
        else {
            if (this.moveToPosition != undefined) {
                let dir = Vec2.sub(this.moveToPosition, this.cameraWorldPosition)
                if (Vec2.lengthOf(dir) > 5) {
                    dir = Vec2.normalize(dir)
                    input.x = dir.x
                    input.y = dir.y
                }
                else {
                    this.moveToPosition = undefined
                }
            }
        }

        input = Vec2.normalize(input)

        this.cameraTargetPosition = Vec2.add(this.cameraTargetPosition, Vec2.multiply(input, this.cameraSpeed * deltaTime))
    
        this.cameraWorldPosition.x = UTILS.Lerp(this.cameraWorldPosition.x, this.cameraTargetPosition.x, 1 - Math.exp(-this.cameraStiffness * deltaTime))
        this.cameraWorldPosition.y = UTILS.Lerp(this.cameraWorldPosition.y, this.cameraTargetPosition.y, 1 - Math.exp(-this.cameraStiffness * deltaTime))

        this.grid.x = this.cameraWorldPosition.x - this.grid.width / 2
        this.grid.y = this.cameraWorldPosition.y - this.grid.height / 2
        if (this.worldRoot) {
            this.worldRoot.x = -this.cameraWorldPosition.x + CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = -this.cameraWorldPosition.y + CONSTS.GAME_HEIGHT / 2
        }
    }
}