import * as PIXI from "pixi.js"
import { Unit } from "../shared/unit.js"
import * as COLORS from "./colors.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"
import * as TEXTURES from "./textures.js"
// import { smoothFilter } from "./shaders.js"

export class UnitRepresentation {
    data: Unit
    root = new PIXI.Container()
    body: PIXI.Sprite
    border: PIXI.Sprite

    color: number
    
    constructor(data: Unit, color: number) {
        this.data = data
        this.color = color
        
        this.root.x = data.position.x
        this.root.y = data.position.y
    
        this.body = PIXI.Sprite.from(TEXTURES.textures.unit1)
        this.body.pivot.set(this.body.width/2, this.body.height/2)
        this.body.scale.set(TEXTURES.baseScale)
        this.body.tint = color
        // this.body.filters = [smoothFilter]

        this.border = PIXI.Sprite.from(TEXTURES.textures.unit1Border)
        this.border.pivot.set(this.border.width/2, this.border.height/2)
        this.border.scale.set(TEXTURES.baseScale)
        this.border.visible = false
        this.border.tint = COLORS.SELECTED_UNIT_BORDER_COLOR

        this.root.addChild(this.body)
        this.root.addChild(this.border)
    }

    setSelected(selected: boolean) {
        this.border.visible = selected
    }
}