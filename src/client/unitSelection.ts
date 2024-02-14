import * as PIXI from "pixi.js"
import { Vec2 } from "../shared/utils.js"
import { UnitRepresentation } from "./unitRepresentation.js"
import * as GUTILS from "./gameUtils.js"
import * as COLORS from "./colors.js"
import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as LAYERS from "./layers.js"

export class UnitSelection {
    sprite: PIXI.Sprite

    selectedUnits = new Set<UnitRepresentation>()

    private mouseDownPosition: Vec2 | undefined

    constructor() {
        this.sprite = PIXI.Sprite.from('public/img/pixel.jpg')
        this.sprite.width = 0
        this.sprite.height = 0
        this.sprite.x = 0
        this.sprite.y = 0
        this.sprite.tint = COLORS.UNIT_SELECTION_COLOR[0]
        this.sprite.alpha = COLORS.UNIT_SELECTION_COLOR[1]
        this.sprite.zIndex = LAYERS.UNIT_SELECTION

        window.addEventListener("mouseout", () => {
            this.end()
        })
    }

    begin(mouseDownPosition: Vec2) {
        this.mouseDownPosition = new Vec2(mouseDownPosition.x, mouseDownPosition.y)
        this.sprite.x = mouseDownPosition.x
        this.sprite.y = mouseDownPosition.y
        this.sprite.visible = true
    }

    update(mousePosition: Vec2 | undefined, mouseDown: boolean, selectableUnits: Map<string, UnitRepresentation>) {
        if (!mouseDown || this.mouseDownPosition == undefined || !mousePosition) {
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
                    u.root.x - CONSTS.UNIT_SIZE/2, u.root.y - CONSTS.UNIT_SIZE/2, CONSTS.UNIT_SIZE, CONSTS.UNIT_SIZE
            )) {
                u.setSelected(true)
                this.selectedUnits.add(u)
            }
            else {
                u.setSelected(false)
                this.selectedUnits.delete(u)
            }
        }
    }

    end() {
        this.sprite.visible = false
        this.sprite.width = 0
        this.sprite.height = 0
    }

    getSelectedUnitsData(): Unit[] {
        return Array.from(this.selectedUnits, unitRep => unitRep.data)
    }
}