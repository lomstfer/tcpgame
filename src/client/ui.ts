import * as COLORS from "./colors.js"
import * as CONSTS from "../shared/constants.js"

export class UI {
    private nextUnitFill: HTMLElement | null = null
    private unitsToPlace: HTMLElement | null = null

    private nextMoveFill: HTMLElement | null = null
    private movesLeft: HTMLElement | null = null

    private selfNewUnitTime: number = 0
    private selfNewMoveTime: number = 0

    private nextUnitsFillWidth: number = 0
    private nextMovesFillWidth: number = 0

    constructor() {
        {
            const nextUnitLoad = document.getElementById("next-unit-load-bar-parent")
            if (nextUnitLoad) {
                this.nextUnitFill = document.getElementById("next-unit-load-bar-fill")
                if (this.nextUnitFill) {
                    this.nextUnitFill.style.backgroundColor = "#" + COLORS.SELF_COLOR.toString(16)
                }
                this.unitsToPlace = document.getElementById("next-unit-load-number")
            }
        }

        {
            const nextMoveLoad = document.getElementById("next-move-load-bar-parent")
            if (nextMoveLoad) {
                this.nextMoveFill = document.getElementById("next-move-load-bar-fill")
                this.movesLeft = document.getElementById("next-move-load-number")
            }
        }
    }

    update(deltaTime: number, time: number, unitsLeft: number, movesLeft: number): [number, number] {
        if (this.nextUnitFill) {
            this.selfNewUnitTime += deltaTime
            if (this.selfNewUnitTime >= CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS) {
                unitsLeft += 1
                this.selfNewUnitTime = 0
            }

            let itime = Math.round(time) % CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS / CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS
            this.nextUnitsFillWidth = itime * 100
            this.nextUnitFill.style.width = (itime * 100).toString() + "%"
        }
        if (this.nextMoveFill) {
            this.selfNewMoveTime += deltaTime
            if (this.selfNewMoveTime >= CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS) {
                movesLeft += 1
                this.selfNewMoveTime = 0
            }

            let itime = Math.round(time) % CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS / CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS
            this.nextMovesFillWidth = itime * 100
            this.nextMoveFill.style.width = (itime * 100).toString() + "%"
        }

        if (this.unitsToPlace) {
            this.unitsToPlace.textContent = unitsLeft.toString()
        }
        if (this.movesLeft) {
            this.movesLeft.textContent = movesLeft.toString()
        }

        return [unitsLeft, movesLeft]
    }
}