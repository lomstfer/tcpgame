import * as PIXI from "pixi.js"
import { Unit } from "../shared/unit.js"
import * as COLORS from "./colors.js"

export class UnitRepresentation {
    data: Unit
    body: PIXI.Graphics
    border: PIXI.Graphics
    
    constructor(data: Unit, color: number) {
        this.data = data
        
        const width = 20
        const height = 20
    
        this.body = new PIXI.Graphics()
        this.body.width = width
        this.body.height = height
        this.body.position.x = data.position.x
        this.body.position.y = data.position.y
        this.body.beginFill(0xffffff)
        this.body.drawRect(0, 0, width, height)
        this.body.endFill()
        this.body.pivot.set(width/2, height/2)
        console.log(this.body.scale)
        this.body.tint = color

        this.border = new PIXI.Graphics()
        this.border.lineStyle(3, COLORS.SELECTED_UNIT_BORDER_COLOR)
        this.border.drawRect(0, 0, width, height)
        this.border.visible = false
    
        this.body.addChild(this.border)
    }
}