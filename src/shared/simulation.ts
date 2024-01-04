import { Unit } from "./unit.js"
import { Vec2 } from "./utils.js"
import * as CONSTS from "../shared/constants.js"

export function moveUnit(unit: Unit) {
    if (unit.movingTo == undefined) {
        return
    }
    let d = Vec2.sub(unit.movingTo, unit.position)
    if (Vec2.lengthOf(d) < 5) {
        return
    }
    d = Vec2.normalize(d)
    unit.position = Vec2.add(unit.position, Vec2.multiply(d, CONSTS.UNIT_SPEED * CONSTS.WORLD_UPDATE_S))
}