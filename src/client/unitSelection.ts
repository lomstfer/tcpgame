import * as PIXI from "pixi.js"
import { Vec2 } from "../shared/utils.js"

export class UnitSelection {
    sprite: PIXI.Sprite

    private mouseDownPosition: Vec2 | undefined

    constructor() {
        this.sprite = PIXI.Sprite.from('public/img/pixel.jpg')
        this.sprite.width = 0
        this.sprite.height = 0
        this.sprite.x = 0
        this.sprite.y = 0
        this.sprite.tint = 0xFF0000
        this.sprite.alpha = 0.3
    }

    begin(mouseDownPosition: Vec2) {
        this.mouseDownPosition = new Vec2(mouseDownPosition.x, mouseDownPosition.y)
        this.sprite.x = mouseDownPosition.x
        this.sprite.y = mouseDownPosition.y
        this.sprite.visible = true
    }

    update(mousePosition: Vec2, mouseDown: boolean) {
        if (!mouseDown || this.mouseDownPosition == undefined) {
            return
        }
        let diff = new Vec2(mousePosition.x - this.mouseDownPosition.x, mousePosition.y - this.mouseDownPosition.y)
        if (diff.x < 0) {
            this.sprite.x = mousePosition.x
        }
        if (diff.y < 0) {
            this.sprite.y = mousePosition.y
        }
        this.sprite.width = Math.abs(diff.x)
        this.sprite.height = Math.abs(diff.y)
    }

    end(/* list of selectables */) {
        this.sprite.visible = false
        this.sprite.width = 0
        this.sprite.height = 0
    }
}