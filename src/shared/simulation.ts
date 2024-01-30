import { Unit } from "./unit.js"
import { Vec2 } from "./utils.js"
import * as CONSTS from "../shared/constants.js"

export function moveUnit(unit: Unit): [boolean, boolean] /* stopped moving, moving */ {
    if (unit.movingTo == undefined) {
        return [false, false]
    }
    let d = Vec2.sub(unit.movingTo, unit.position)
    if (d.x == 0 && d.y == 0) {
        unit.movingTo = undefined
        return [true, false]
    }
    if (Vec2.squareLengthOf(d) < (CONSTS.UNIT_SPEED * CONSTS.WORLD_UPDATE_S) ** 2) {
        unit.position = new Vec2(unit.movingTo.x, unit.movingTo.y)
        unit.movingTo = undefined
        return [true, false]
    }
    d = Vec2.normalize(d)
    unit.position = Vec2.add(unit.position, Vec2.multiply(d, CONSTS.UNIT_SPEED * CONSTS.WORLD_UPDATE_S))
    // console.log(unit.position.x, unit.position.y)
    return [false, true]
}

export function spreadOutUnits(unitRoundedPositions: Map<string, Unit>) {
    
}