import * as PIXI from "pixi.js"
import { Unit } from "../shared/unit.js"
import * as COLORS from "./colors.js"
import { Vec2 } from "../shared/utils.js"
import * as CONSTS from "../shared/constants.js"

export class UnitRepresentation {
    data: Unit
    body: PIXI.Graphics
    border: PIXI.Graphics

    velocity = new Vec2(0, 0)
    
    constructor(data: Unit, color: number) {
        this.data = data
        
        const width = CONSTS.UNIT_SIZE
        const height = CONSTS.UNIT_SIZE
    
        this.body = new PIXI.Graphics()
        this.body.width = width
        this.body.height = height
        this.body.position.x = data.position.x
        this.body.position.y = data.position.y
        this.body.beginFill(0xffffff)
        this.body.drawRect(0, 0, width, height)
        this.body.endFill()
        this.body.pivot.set(width/2, height/2)
        this.body.tint = color

        this.border = new PIXI.Graphics()
        this.border.lineStyle(3, 0xffffff)
        this.border.drawRect(0, 0, width, height)
        this.border.visible = false
        this.border.tint = COLORS.SELECTED_UNIT_BORDER_COLOR
    
        this.body.addChild(this.border)
    }

    update(deltatime: number) {
        let result = new Vec2(this.body.x, this.body.y)
        result = Vec2.add(result, Vec2.multiply(this.velocity, deltatime))
        this.body.x = result.x
        this.body.y = result.y
    }
}