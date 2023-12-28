import { Vec2 } from "./utils"

export class Item {
    id: number
    name: string
    position: Vec2
    
    constructor(id: number, name: string, position: Vec2) {
        this.id = id
        this.name = name
        this.position = position
    }    
}