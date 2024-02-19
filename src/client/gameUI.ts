import * as COLORS from "./colors.js"
import * as CONSTS from "../shared/constants.js"

export class GameUI {
    private nextUnitFill: HTMLElement | null = null
    private unitsToPlace: HTMLElement | null = null

    private nextMoveFill: HTMLElement | null = null
    private movesLeft: HTMLElement | null = null

    private newUnitTime: number
    private newMoveTime: number

    constructor(matchTime: number) {
        this.newUnitTime = matchTime
        this.newMoveTime = matchTime

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
            this.newUnitTime += deltaTime
            while (this.newUnitTime >= CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS) {
                unitsLeft += 1
                this.newUnitTime -= CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS
            }
            const fraction = this.newUnitTime / CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS * 100
            this.nextUnitFill.style.width = (fraction).toString() + "%"
        }

        if (this.nextMoveFill) {
            this.newMoveTime += deltaTime
            while (this.newMoveTime >= CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS) {
                movesLeft += 1
                this.newMoveTime -= CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS
            }
            const fraction = this.newMoveTime / CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS * 100
            this.nextMoveFill.style.width = (fraction).toString() + "%"
        }

        if (this.unitsToPlace) {
            this.unitsToPlace.textContent = unitsLeft.toString()
        }
        if (this.movesLeft) {
            this.movesLeft.textContent = movesLeft.toString()
        }

        return [unitsLeft, movesLeft]
    }

    handleTimeAway(timeAwayMS: number, unitsLeft: number, movesLeft: number, unitsLeftTime: number, movesLeftTime: number): [number, number] {
        const unitsToAdd = Math.floor(timeAwayMS / CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS)
        unitsLeft += unitsToAdd
        this.newUnitTime = unitsLeftTime + timeAwayMS - unitsToAdd * CONSTS.CLIENT_GET_NEW_UNIT_TIME_MS
        
        const movesToAdd = Math.floor(timeAwayMS / CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS)
        movesLeft += movesToAdd
        this.newMoveTime = movesLeftTime + timeAwayMS - movesToAdd * CONSTS.CLIENT_GET_NEW_MOVE_TIME_MS
        
        return [unitsLeft, movesLeft]
    }
}