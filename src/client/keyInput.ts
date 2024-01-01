

export class KeyInput {
    private keysPressed = new Set<string>()
    private keysPressedLastFrame = new Set<string>()

    constructor() {
        document.addEventListener("keydown", (event) => {
            this.keysPressed.add(event.code)
        })
        document.addEventListener("keyup", (event) => {
            this.keysPressed.delete(event.code)
        })
        window.addEventListener("blur", () => {
            this.keysPressed.clear()
        })
        window.addEventListener("resize", () => {
            this.keysPressed.clear()
        })
    }

    isKeyDown(keycode: string): boolean {
        return this.keysPressed.has(keycode)
    }

    keyPressed(keycode: string): boolean {
        return !this.keysPressedLastFrame.has(keycode) && this.keysPressed.has(keycode)
    }

    updateLastKeys() {
        this.keysPressedLastFrame = new Set(this.keysPressed)
    }
}