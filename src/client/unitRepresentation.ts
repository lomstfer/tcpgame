import * as PIXI from "pixi.js"
import { Unit } from "../shared/unit.js"
import * as COLORS from "./colors.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as TEXTURES from "./textures.js"
import { outlineShader } from "./shaders.js"

export class UnitRepresentation {
    data: Unit
    root = new PIXI.Container()
    body: PIXI.Sprite
    border: PIXI.Sprite

    velocity = new Vec2(0, 0)

    color: number

    // outlineFilter = new PIXI.Filter(undefined, outlineShader)
    
    constructor(data: Unit, color: number) {
        this.data = data
        this.color = color
        
        this.root.x = data.position.x
        this.root.y = data.position.y

        const width = CONSTS.UNIT_SIZE
        const height = CONSTS.UNIT_SIZE
    
        this.body = PIXI.Sprite.from(TEXTURES.textures.unit)
        this.body.pivot.set(this.body.width/2, this.body.height/2)
        this.body.width = width
        this.body.height = height
        this.body.tint = color

        // this.body.filters = [this.outlineFilter]

        this.border = PIXI.Sprite.from(TEXTURES.textures.unit)
        this.border.pivot.set(this.border.width/2, this.border.height/2)
        this.border.width = width
        this.border.height = height
        this.border.visible = false
        this.border.scale.x *= 1.2
        this.border.scale.y *= 1.2
        this.border.tint = COLORS.SELECTED_UNIT_BORDER_COLOR
        
        // this.root.addChild(this.border)
        this.root.addChild(this.body)
    }

    update(deltatime: number) {
        let result = new Vec2(this.body.x, this.body.y)
        result = Vec2.add(result, Vec2.multiply(this.velocity, deltatime))
        this.body.x = result.x
        this.body.y = result.y
    }

    setSelected(selected: boolean) {
        if (selected) {
            this.body.tint = COLORS.SELECTED_UNIT_BORDER_COLOR
            return
        }
        this.body.tint = this.color
    }
}