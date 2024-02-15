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

    yesSirAnimationTimeout: NodeJS.Timeout | undefined = undefined
    
    constructor(data: Unit, color: number) {
        this.data = data
        this.color = color
        
        this.root.x = data.position.x
        this.root.y = data.position.y
    
        this.body = PIXI.Sprite.from(TEXTURES.textures.unit1)
        this.body.scale.set(TEXTURES.baseScale)
        this.body.tint = color

        this.border = PIXI.Sprite.from(TEXTURES.textures.unit1Border)
        this.border.scale.set(TEXTURES.baseScale)
        this.border.visible = false
        this.border.tint = COLORS.SELECTED_UNIT_BORDER_COLOR

        this.root.addChild(this.body)
        this.root.addChild(this.border)

        this.root.zIndex = LAYERS.UNIT_STILL
    }

    yesSirAnimation() {
        if (this.yesSirAnimationTimeout) {
            clearTimeout(this.yesSirAnimationTimeout)
            this.yesSirAnimationTimeout = undefined
        }

        this.body.texture = TEXTURES.textures.unit1YesSir
        this.border.texture = TEXTURES.textures.unit1YesSirBorder
        this.yesSirAnimationTimeout = setTimeout(() => {
            this.body.texture = TEXTURES.textures.unit1
            this.border.texture = TEXTURES.textures.unit1Border
            this.yesSirAnimationTimeout = undefined
        }, 200)
    }
    
    setSelected(selected: boolean) {
        this.border.visible = selected
    }
    
    setIsMoving(moving: boolean) {
        this.root.zIndex = moving ? LAYERS.UNIT_MOVING : LAYERS.UNIT_STILL
    }

    flipSprite(flipTowards: number) {
        this.root.scale.x = flipTowards > 0 ? Math.abs(this.root.scale.x) : flipTowards < 0 ? -Math.abs(this.root.scale.x) : this.root.scale.x
    }
}