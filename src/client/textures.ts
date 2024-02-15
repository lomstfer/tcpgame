import * as PIXI from "pixi.js"

export const textures = {
    unit1: PIXI.Texture.from("public/img/u.png"),
    unit1Border: PIXI.Texture.from("public/img/u_b.png"),
    unit1YesSir: PIXI.Texture.from("public/img/us.png"),
    unit1YesSirBorder: PIXI.Texture.from("public/img/us_b.png"),
}
textures.unit1.defaultAnchor = new PIXI.Point(textures.unit1.width / 2, textures.unit1.height / 2)
textures.unit1Border.defaultAnchor = new PIXI.Point(textures.unit1Border.width / 2, textures.unit1Border.height / 2)
textures.unit1YesSir.defaultAnchor = new PIXI.Point(textures.unit1YesSir.width / 2, textures.unit1YesSir.height / 2)
textures.unit1YesSirBorder.defaultAnchor = new PIXI.Point(textures.unit1YesSirBorder.width / 2, textures.unit1YesSirBorder.height / 2)

export const baseScale = 0.75