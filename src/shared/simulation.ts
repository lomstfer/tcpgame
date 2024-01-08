import { Unit } from "./unit.js"
import { Vec2 } from "./utils.js"
import * as CONSTS from "../shared/constants.js"

export function moveUnit(unit: Unit) {
    if (unit.movingTo == undefined) {
        return
    }
    let d = Vec2.sub(unit.movingTo, unit.position)
    if (d.x == 0 && d.y == 0) {
        return
    }
    if (Vec2.squareLengthOf(d) < (CONSTS.UNIT_SPEED * CONSTS.WORLD_UPDATE_S) ** 2) {
        unit.position = new Vec2(unit.movingTo.x, unit.movingTo.y)
        unit.movingTo = undefined
        return
    }
    d = Vec2.normalize(d)
    unit.position = Vec2.add(unit.position, Vec2.multiply(d, CONSTS.UNIT_SPEED * CONSTS.WORLD_UPDATE_S))
    // console.log(unit.position.x, unit.position.y)
}

export function spreadOutUnits(unitRoundedPositions: Map<string, Unit>) {
    
}