import { Vec2 } from "./utils"

export class Unit {
    id: string
    position: Vec2
    
    constructor(id: string, position: Vec2) {
        this.id = id
        this.position = position
    }    
}