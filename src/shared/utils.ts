import * as PIXI from "pixi.js"


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

    static Lerp(p0: Vec2, p1: Vec2, t: number): Vec2 {
        t = t < 0 ? 0 : t > 1 ? 1 : t
        return new Vec2(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t)
    }

    static LerpUnclamped(p0: Vec2, p1: Vec2, t: number): Vec2 {
        return new Vec2(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t)
    }
}

export function scaleAndCenter(stage: PIXI.Container, virtualWidth: number, virtualHeight: number) {
    const swidth = window.innerWidth
    const sheight = window.innerHeight

    let scale: number
    let posX: number
    let posY: number

    if (swidth / sheight > virtualWidth / virtualHeight) {
        scale = swidth / virtualWidth
        posX = 0
        posY = (sheight - virtualHeight * scale) / 2
    } else if (swidth / sheight < virtualWidth / virtualHeight) {
        scale = sheight / virtualHeight
        posX = (swidth - virtualWidth * scale) / 2
        posY = 0
    } else {
        scale = swidth / virtualWidth
        posX = 0
        posY = 0
    }

    stage.scale.set(scale)
    stage.position.x = posX
    stage.position.y = posY
}