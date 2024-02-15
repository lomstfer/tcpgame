import { Unit } from "./unit.js"
import { Vec2 } from "./utils.js"
import * as CONSTS from "../shared/constants.js"
/**
 * 
 * @returns [just stopped moving, moving]
 */
export function moveUnit(unit: Unit, deltaTimeS: number): [boolean, boolean] /* just stopped moving, moving */ {
    if (unit.movingTo == undefined) {
        return [false, false]
    }
    let d = Vec2.sub(unit.movingTo, unit.position)
    if (d.x == 0 && d.y == 0) {
        unit.movingTo = undefined
        return [true, false]
    }
    if (Vec2.squareLengthOf(d) < (CONSTS.UNIT_SPEED * deltaTimeS) ** 2) {
        unit.position = new Vec2(unit.movingTo.x, unit.movingTo.y)
        unit.movingTo = undefined
        return [true, false]
    }
    d = Vec2.normalize(d)
    unit.position = Vec2.add(unit.position, Vec2.multiply(d, CONSTS.UNIT_SPEED * deltaTimeS))
    return [false, true]
}