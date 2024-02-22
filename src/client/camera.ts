import * as PIXI from "pixi.js"
import * as UTILS from "../shared/utils.js"
import * as GUTILS from "./gameUtils.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import { KeyInput } from "./keyInput.js"

export class Camera {
    private targetPosition = new Vec2(0, 0)
    worldPosition = new Vec2(0, 0)
    interpPosition = new Vec2(0, 0)
    private stiffness = 0.006
    private speed = 0.2

    getMouseWorldPosition(
        mousePositionOnCanvas: PIXI.Point | Vec2, 
        container: PIXI.Container<PIXI.DisplayObject>, 
    ): Vec2 {
        return GUTILS.getMouseWorldPosition(mousePositionOnCanvas, this.worldPosition, container, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
    }

    getMouseWorldPositionClampedToWorldSize(
        mousePositionOnCanvas: PIXI.Point | Vec2, 
        container: PIXI.Container<PIXI.DisplayObject>, 
    ): Vec2 {
        const p = GUTILS.getMouseWorldPosition(mousePositionOnCanvas, this.worldPosition, container, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
        return Vec2.clamp(p, new Vec2(-CONSTS.WORLD_WIDTH/2, -CONSTS.WORLD_HEIGHT/2), new Vec2(CONSTS.WORLD_WIDTH/2, CONSTS.WORLD_HEIGHT/2))
    }

    update(deltaTime: number, keys: KeyInput) {        
        /* let keyInput = new Vec2(0, 0)
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
            input.x = keyInput.x
            input.y = keyInput.y
        }

        input = Vec2.normalize(input)

        this.targetPosition = Vec2.add(this.targetPosition, Vec2.multiply(input, this.speed * deltaTime)) */

        this.worldPosition.x = UTILS.Lerp(this.worldPosition.x, this.targetPosition.x, 1 - Math.exp(-this.stiffness * deltaTime))
        this.worldPosition.y = UTILS.Lerp(this.worldPosition.y, this.targetPosition.y, 1 - Math.exp(-this.stiffness * deltaTime))
    }

    setPosition(position: Vec2) {
        this.targetPosition = new Vec2(position.x, position.y)
        this.worldPosition = new Vec2(position.x, position.y)
    }
}