import * as PIXI from "pixi.js"
import { Unit } from "../shared/unit.js"
import * as COLORS from "./colors.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as TEXTURES from "./textures.js"
import { shapeFragShader } from "./shaders.js"
import * as LAYERS from "./layers.js"

export class UnitRepresentation {
    data: Unit
    root = new PIXI.Container()
    body: PIXI.Sprite
    border: PIXI.Sprite

    color: number

    shapeFilter = new PIXI.Filter(undefined, shapeFragShader, {
        spreadOut: false
    })
    
    constructor(data: Unit, color: number) {
        this.data = data
        this.color = color
        
        this.root.x = data.position.x
        this.root.y = data.position.y
    
        this.body = PIXI.Sprite.from(TEXTURES.textures.unit1)
        this.body.pivot.set(this.body.width/2, this.body.height/2)
        this.body.scale.set(TEXTURES.baseScale)
        this.body.tint = color
        this.body.filters = [this.shapeFilter/* , new PIXI.FXAAFilter() */]

        this.border = PIXI.Sprite.from(TEXTURES.textures.unit1Border)
        this.border.pivot.set(this.border.width/2, this.border.height/2)
        this.border.scale.set(TEXTURES.baseScale)
        this.border.visible = false
        this.border.tint = COLORS.SELECTED_UNIT_BORDER_COLOR

        this.root.addChild(this.body)
        this.root.addChild(this.border)

        this.root.zIndex = 1
    }
    
    setSelected(selected: boolean) {
        this.border.visible = selected
    }
    
    setMoving(moving: boolean) {
        this.shapeFilter.uniforms.spreadOut = !moving
        this.root.zIndex = moving ? LAYERS.UNIT_MOVING : LAYERS.UNIT_STILL
    }
}