import * as PIXI from "pixi.js"
import { Vec2 } from "../shared/utils.js"
import { UnitRepresentation } from "./unitRepresentation.js"
import * as GUTILS from "./gameUtils.js"
import * as COLORS from "./colors.js"
import { Unit } from "../shared/unit.js"

export class UnitSelection {
    sprite: PIXI.Sprite

    selectedUnits = new Set<Unit>()

    private mouseDownPosition: Vec2 | undefined

    constructor() {
        this.sprite = PIXI.Sprite.from('public/img/pixel.jpg')
        this.sprite.width = 0
        this.sprite.height = 0
        this.sprite.x = 0
        this.sprite.y = 0
        this.sprite.tint = COLORS.UNIT_SELECTION_COLOR
        this.sprite.alpha = 0.3
        this.sprite.zIndex = 1
    }

    begin(mouseDownPosition: Vec2) {
        this.mouseDownPosition = new Vec2(mouseDownPosition.x, mouseDownPosition.y)
        this.sprite.x = mouseDownPosition.x
        this.sprite.y = mouseDownPosition.y
        this.sprite.visible = true
    }

    update(mousePosition: Vec2, mouseDown: boolean, selectableUnits: Map<string, UnitRepresentation>) {
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

        this.selectedUnits.clear()
        for (const u of selectableUnits.values()) {
            if (GUTILS.overlaps(
                    this.sprite.x, this.sprite.y, this.sprite.width, this.sprite.height,
                    u.body.x - u.body.width/2, u.body.y - u.body.height/2, u.body.width, u.body.height
            )) {
                u.body.getChildAt(0).visible = true
                this.selectedUnits.add(u.data)
            }
            else {
                u.body.getChildAt(0).visible = false
                this.selectedUnits.delete(u.data)
            }
        }
    }

    end() {
        this.sprite.visible = false
        this.sprite.width = 0
        this.sprite.height = 0
    }
}