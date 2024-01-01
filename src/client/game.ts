import * as PIXI from "pixi.js"
import * as GUTILS from "./gameUtils.js"
import * as UTILS from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import { Vec2 } from "../shared/utils.js"
import { MatchData } from "../shared/matchData.js"
import { UnitSelection } from "./unitSelection.js"
import { Grid } from "./grid.js"
import mitt from "mitt" // events
import { KeyInput } from "./keyInput.js"

type gameEvents = {
    spawnUnitCommand: Vec2
}
export const gameEventEmitter = mitt<gameEvents>()

export class GameInstance {
    private appStage: PIXI.Container<PIXI.DisplayObject>

    private worldRoot: PIXI.Container
    private elapsedTime = 0

    private cameraTargetPosition = new Vec2(0, 0)
    private cameraWorldPosition = new Vec2(0, 0)
    private cameraStiffness = 6
    private cameraSpeed = 200

    private moveToPosition: Vec2 | undefined = undefined
    private mouseDown = false
    private mouseWorldPosition = new Vec2(0, 0)
    private mouseCanvasPosition = new Vec2(0, 0)

    private unitSelection = new UnitSelection()
    private grid = new Grid()

    constructor(appStage: PIXI.Container<PIXI.DisplayObject>, matchData: MatchData) {
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
            const worldPos = GUTILS.getMouseWorldPosition(e.client, this.cameraWorldPosition, this.appStage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
            this.mouseWorldPosition = new Vec2(worldPos.x, worldPos.y)
            this.mouseCanvasPosition = new Vec2(e.client.x, e.client.y)

            this.unitSelection.begin(this.mouseWorldPosition)
        })
        this.appStage.addEventListener("mouseup", e => {
            this.mouseDown = false
            this.unitSelection.end()
        })
        this.appStage.addEventListener("mousemove", e => {
            const worldPos = GUTILS.getMouseWorldPosition(e.client, this.cameraWorldPosition, this.appStage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
            this.mouseWorldPosition = new Vec2(worldPos.x, worldPos.y)
            this.mouseCanvasPosition = new Vec2(e.client.x, e.client.y)
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

    simulate() {

    }

    update(deltaTime: number, keys: KeyInput) {
        this.moveCamera(deltaTime, keys)
        const worldPos = GUTILS.getMouseWorldPosition(this.mouseCanvasPosition, this.cameraWorldPosition, this.appStage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
        this.mouseWorldPosition = new Vec2(worldPos.x, worldPos.y)

        this.unitSelection.update(this.mouseWorldPosition, this.mouseDown)
        this.grid.update(this.cameraWorldPosition)

        if (keys.keyPressed("KeyR")) {
            gameEventEmitter.emit("spawnUnitCommand", this.mouseWorldPosition)
        }
    }

    private moveCamera(deltaTime: number, keys: KeyInput) {
        this.elapsedTime += deltaTime

        let keyInput = new Vec2(0, 0)
        if (keys.isKeyDown("KeyA")) {
            keyInput.x -= 1
        }
        if (keys.isKeyDown("KeyD")) {
            keyInput.x += 1
        }
        if (keys.isKeyDown("KeyW")) {
            keyInput.y -= 1
        }
        if (keys.isKeyDown("KeyS")) {
            keyInput.y += 1
        }

        let input = new Vec2(0, 0)

        if (keyInput.x != 0 || keyInput.y != 0) {
            this.moveToPosition = undefined
            input.x = keyInput.x
            input.y = keyInput.y
        }
        /* else {
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
        } */

        input = Vec2.normalize(input)

        this.cameraTargetPosition = Vec2.add(this.cameraTargetPosition, Vec2.multiply(input, this.cameraSpeed * deltaTime))

        this.cameraWorldPosition.x = UTILS.Lerp(this.cameraWorldPosition.x, this.cameraTargetPosition.x, 1 - Math.exp(-this.cameraStiffness * deltaTime))
        this.cameraWorldPosition.y = UTILS.Lerp(this.cameraWorldPosition.y, this.cameraTargetPosition.y, 1 - Math.exp(-this.cameraStiffness * deltaTime))

        if (this.worldRoot) {
            this.worldRoot.x = -this.cameraWorldPosition.x + CONSTS.GAME_WIDTH / 2
            this.worldRoot.y = -this.cameraWorldPosition.y + CONSTS.GAME_HEIGHT / 2
        }
    }

    spawnUnit(position: Vec2) {
        const sprite = PIXI.Sprite.from('public/img/pixel.jpg')
        sprite.width = 20
        sprite.height = 20
        sprite.position.x = position.x
        sprite.position.y = position.y
        sprite.pivot.set(0.5)
        this.worldRoot.addChild(sprite)
    }
}