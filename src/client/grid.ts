import * as PIXI from "pixi.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import { gridFragShader } from "./shaders.js"

export class Grid {
    sprite: PIXI.Sprite
    private gridFilter: PIXI.Filter
    private lastPosition: Vec2 = new Vec2(0, 0)

    constructor() {
        this.sprite = PIXI.Sprite.from('public/img/pixel.jpg')
        this.sprite.width = CONSTS.GAME_WIDTH
        this.sprite.height = CONSTS.GAME_HEIGHT
        this.sprite.x = 0
        this.sprite.y = 0

        this.gridFilter = new PIXI.Filter(undefined, gridFragShader)
        this.gridFilter.autoFit = false
        this.sprite.filters = [this.gridFilter]
        this.gridFilter.uniforms.uSize = new PIXI.Point(this.sprite.width, this.sprite.height)
        this.gridFilter.uniforms.uWorldPosition = new PIXI.Point(this.sprite.x, this.sprite.y)
    }

    update(cameraPosition: Vec2) {
        this.sprite.x = cameraPosition.x - this.sprite.width / 2
        this.sprite.y = cameraPosition.y - this.sprite.height / 2

        if (this.sprite.x != this.lastPosition.x || this.sprite.y != this.lastPosition.y) {
            this.gridFilter.uniforms.uWorldPosition = new PIXI.Point(this.sprite.x, this.sprite.y)
        }
        this.lastPosition = new Vec2(this.sprite.x, this.sprite.y)
    }
}