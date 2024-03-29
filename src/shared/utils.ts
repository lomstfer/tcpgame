import * as PIXI from "pixi.js"
import {GRID_SQUARE_SIZE} from "../shared/constants.js"
import * as CONSTS from "../shared/constants.js"

export function getAverage(array: number[]): number {
    let sum = 0
    for (const v of array) {
        sum += v
    }
    return sum / array.length
}

export function getMedian(sortedArray: number[]): number {
    if (sortedArray.length % 2 == 0) {
        const first = sortedArray[sortedArray.length / 2 - 1]
        const second = sortedArray[sortedArray.length / 2]
        return (first + second) / 2
    }
    return sortedArray[Math.floor(sortedArray.length / 2)]
}

export function getAverageDiffFromMedian(array: number[], median: number): number {
    let sum = 0
    for (const n of array) {
        sum += Math.abs(n - median)
    }
    const average = sum / array.length
    return average
}

export function getAverageCloseToMedian(array: number[], amountOfAvgDiffsAway: number): number {
    const median = getMedian(array)
    const avgDiff = getAverageDiffFromMedian(array, median)
    const resultArray = array.filter((v) => Math.abs(v - median) <= avgDiff * amountOfAvgDiffsAway)
    return getAverage(resultArray)
}

export function prependUint8(byte: number, array: Uint8Array): Uint8Array {
    let result = new Uint8Array(array.length + 1)
    result[0] = byte
    result.set(array, 1)
    return result
}

export function Lerp(p0: number, p1: number, t: number): number {
    t = t < 0 ? 0 : t > 1 ? 1 : t
    return p0 + (p1 - p0) * t
}

export function LerpUnclamped(p0: number, p1: number, t: number): number {
    return p0 + (p1 - p0) * t
}

export class Vec2 {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    static add(vec: Vec2, other: Vec2): Vec2 {
        return new Vec2(vec.x + other.x, vec.y + other.y)
    }

    static sub(vec: Vec2, other: Vec2): Vec2 {
        return new Vec2(vec.x - other.x, vec.y - other.y)
    }

    static multiply(vec: Vec2, scalar: number): Vec2 {
        return new Vec2(vec.x * scalar, vec.y * scalar)
    }

    static divide(vec: Vec2, scalar: number): Vec2 {
        return new Vec2(vec.x / scalar, vec.y / scalar)
    }

    static normalize(vec: Vec2): Vec2 {
        let len = Math.sqrt(vec.x * vec.x + vec.y * vec.y)
        if (len == 0) {
            return vec
        }
        return new Vec2(vec.x / len, vec.y / len)
    }

    static lengthOf(vec: Vec2): number {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y)
    }

    static squareLengthOf(vec: Vec2): number {
        return vec.x * vec.x + vec.y * vec.y
    }

    static lerp(p0: Vec2, p1: Vec2, t: number): Vec2 {
        t = t < 0 ? 0 : t > 1 ? 1 : t
        return new Vec2(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t)
    }

    static lerpUnclamped(p0: Vec2, p1: Vec2, t: number): Vec2 {
        return new Vec2(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t)
    }

    static randomDirection(length?: number) : Vec2 {
        const angle = Math.random() * (2 * Math.PI)
        const dir = new Vec2(Math.cos(angle), Math.sin(angle))
        if (length) {
            return Vec2.multiply(dir, length)
        }
        return dir
    }

    static vec2FromAngle(radians: number, length?: number) : Vec2 {
        const output = new Vec2(Math.cos(radians), Math.sin(radians))
        if (length) {
            return Vec2.multiply(output, length)
        }
        return output
    }

    static round(v: Vec2): Vec2 {
        return new Vec2(Math.round(v.x), Math.round(v.y))
    }

    static clamp(v: Vec2, min: Vec2, max: Vec2): Vec2 {
        const out = new Vec2(v.x, v.y)
        if (out.x < min.x) {
            out.x = min.x
        }
        if (out.y < min.y) {
            out.y = min.y
        }
        if (out.x > max.x) {
            out.x = max.x
        }
        if (out.y > max.y) {
            out.y = max.y
        }
        return out
    }

    static clampToWorld(v: Vec2): Vec2 {
        return Vec2.clamp(v, 
            new Vec2(-CONSTS.WORLD_WIDTH/2, -CONSTS.WORLD_HEIGHT/2), 
            new Vec2(CONSTS.WORLD_WIDTH/2, CONSTS.WORLD_HEIGHT/2)
        )
    }
    
    /* static minLength(vec: Vec2, minimum: number): Vec2 {
        let lenSqr = vec.x * vec.x + vec.y * vec.y
        if (lenSqr == 0) {
            return vec
        }
        else if (lenSqr < minimum ** 2) {

        }
    } */
}

export function roundWorldPositionToGrid(position: Vec2): Vec2 {
    return Vec2.multiply(Vec2.round(Vec2.divide(position, GRID_SQUARE_SIZE)), GRID_SQUARE_SIZE)
}