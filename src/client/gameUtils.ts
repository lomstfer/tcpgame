import * as PIXI from "pixi.js"
import * as UTILS from "../shared/utils.js"

export function getMouseWorldPosition(canvasPos: PIXI.Point, cameraPos: UTILS.Vec2, container: PIXI.Container<PIXI.DisplayObject>, gameWidth: number, gameHeight: number): UTILS.Vec2 {
    let output = new UTILS.Vec2(canvasPos.x, canvasPos.y)
    output.x -= container.x
    output.y -= container.y
    output.x /= container.scale.x
    output.y /= container.scale.y
    output.x += cameraPos.x - gameWidth / 2
    output.y += cameraPos.y - gameHeight / 2
    return output
}