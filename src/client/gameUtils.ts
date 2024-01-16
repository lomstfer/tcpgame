import * as PIXI from "pixi.js"
import * as UTILS from "../shared/utils.js"

export function getMouseWorldPosition(canvasPos: PIXI.Point | UTILS.Vec2, cameraPos: UTILS.Vec2, container: PIXI.Container<PIXI.DisplayObject>, gameWidth: number, gameHeight: number): UTILS.Vec2 {
    let output = new UTILS.Vec2(canvasPos.x, canvasPos.y)
    output.x -= container.x
    output.y -= container.y
    output.x /= container.scale.x
    output.y /= container.scale.y
    output.x += cameraPos.x - gameWidth / 2
    output.y += cameraPos.y - gameHeight / 2
    return output
}

export function scaleAndCenter(stage: PIXI.Container, virtualWidth: number, virtualHeight: number) {
    const swidth = window.innerWidth
    const sheight = window.innerHeight

    let scale: number
    let posX: number
    let posY: number

    if (swidth / sheight > virtualWidth / virtualHeight) {
        scale = swidth / virtualWidth
        posX = 0
        posY = (sheight - virtualHeight * scale) / 2
    } else if (swidth / sheight < virtualWidth / virtualHeight) {
        scale = sheight / virtualHeight
        posX = (swidth - virtualWidth * scale) / 2
        posY = 0
    } else {
        scale = swidth / virtualWidth
        posX = 0
        posY = 0
    }
    console.log(scale)
    stage.scale.set(scale)
    stage.position.x = posX
    stage.position.y = posY
}

export function overlaps(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
): boolean {
    return (x1 + w1 > x2 && x1 < x2 + w2) &&
           (y1 + h1 > y2 && y1 < y2 + h2)
}