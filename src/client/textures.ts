import * as PIXI from "pixi.js"

export const textures = {
    unit1: PIXI.Texture.from("public/img/b5.png"),
    unit1Border: PIXI.Texture.from("public/img/b1_border.png")
}
// textures.unit1.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
textures.unit1Border.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST

export const baseScale = 1