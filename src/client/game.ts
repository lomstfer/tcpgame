// import * as PIXI from "pixi.js"
// import * as GUTILS from "./gameUtils.js"
// import * as UTILS from "../shared/utils.js"
// import * as CONSTS from "../shared/constants.js"
// import * as SHADERS from "./shaders.js"
// import * as NET from "./networking.js"
// import { Vec2 } from "../shared/utils.js"

// export function startGame(app: PIXI.Application<HTMLCanvasElement>) {
//     {
//         const inventorySlots = document.getElementById("inventory-slots")
//         for (let i = 0; i < CONSTS.INVENTORY_SIZE; i++) {
//             const slot = document.createElement("div")
//             slot.classList.add("item-slot")
//             slot.id = "item-slot-" + i.toString()
//             inventorySlots?.appendChild(slot)
//         }
//     }

//     const worldRoot = new PIXI.Container()
//     {
//         worldRoot.x = CONSTS.GAME_WIDTH / 2
//         worldRoot.y = CONSTS.GAME_HEIGHT / 2
//         worldRoot.sortableChildren = true
//         app.stage.addChild(worldRoot)
//     }

//     const grid = PIXI.Sprite.from('public/img/pixel.jpg')
//     {
//         grid.width = CONSTS.GAME_WIDTH
//         grid.height = CONSTS.GAME_HEIGHT
//         grid.x = 0
//         grid.y = 0
//         worldRoot.addChild(grid)
//     }

//     const unitSelection = PIXI.Sprite.from('public/img/pixel.jpg')
//     {
//         unitSelection.width = 0
//         unitSelection.height = 0
//         unitSelection.x = 0
//         unitSelection.y = 0
//         unitSelection.tint = 0xFF0000
//         unitSelection.alpha = 0.3
//         worldRoot.addChild(unitSelection)
//     }

//     document.addEventListener("mouseout", () => {
//         endUnitSelection()
//     })

//     const gridFilter = new PIXI.Filter(undefined, SHADERS.gridFragShader)
//     {
//         gridFilter.autoFit = false
//         grid.filters = [gridFilter]
//         gridFilter.uniforms.uSize = new PIXI.Point(grid.width, grid.height)
//         gridFilter.uniforms.uWorldPosition = new PIXI.Point(grid.x, grid.y)
//     }
//     let lastGridPosition = new Vec2(grid.x, grid.y)

//     function updateShaders(time: number) {
//         if (grid.x != lastGridPosition.x || grid.y != lastGridPosition.y) {
//             gridFilter.uniforms.uWorldPosition = new PIXI.Point(grid.x, grid.y)
//         }
//         lastGridPosition = new Vec2(grid.x, grid.y)
//     }

//     let cameraTargetPosition = new Vec2(0, 0)
//     const cameraWorldPosition = new Vec2(0, 0)
//     const cameraStiffness = 6
//     const cameraSpeed = 200

//     let keyInput: Vec2 = new Vec2(0, 0)

//     let moveToPosition: Vec2 | undefined = undefined
//     let mousePosition = new Vec2(0, 0)
//     let mouseDownPosition = new Vec2(0, 0)
//     let mouseDown = false

//     let elapsedTime = 0
//     let accumulator = 0

//     app.stage.addEventListener("mousedown", e => {
//         mouseDown = true
//         const worldPos = GUTILS.getMouseWorldPosition(e.client, cameraWorldPosition, app.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
//         mouseDownPosition.x = worldPos.x
//         mouseDownPosition.y = worldPos.y
//         mousePosition = worldPos
//         beginUnitSelection()
//     })
//     app.stage.addEventListener("mouseup", e => {
//         mouseDown = false
//         endUnitSelection()
//     })
//     app.stage.addEventListener("mousemove", e => {
//         const worldPos = GUTILS.getMouseWorldPosition(e.client, cameraWorldPosition, app.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
//         mousePosition = worldPos
//     })
//     /* app.stage.addEventListener("click", e => {
//         const worldPos = GUTILS.getMouseWorldPosition(e.client, cameraWorldPosition, app.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
//         moveToPosition = worldPos
//     }) */

//     app.ticker.add(() => {
//         const dt = app.ticker.deltaMS / 1000
//         elapsedTime += dt

//         updateUnitSelection()

//         // fixed timestep world update for deterministic behaviour
//         accumulator += dt
//         while (accumulator >= CONSTS.WORLD_UPDATE_S) {
//             worldStep()
//             accumulator -= CONSTS.WORLD_UPDATE_S
//         }
//         //

//         gatherInput(dt)

//         cameraWorldPosition.x = UTILS.Lerp(cameraWorldPosition.x, cameraTargetPosition.x, 1 - Math.exp(-cameraStiffness * dt))
//         cameraWorldPosition.y = UTILS.Lerp(cameraWorldPosition.y, cameraTargetPosition.y, 1 - Math.exp(-cameraStiffness * dt))

//         grid.x = cameraWorldPosition.x - grid.width / 2
//         grid.y = cameraWorldPosition.y - grid.height / 2
//         worldRoot.x = -cameraWorldPosition.x + CONSTS.GAME_WIDTH / 2
//         worldRoot.y = -cameraWorldPosition.y + CONSTS.GAME_HEIGHT / 2

//         updateShaders(elapsedTime)
//     })

//     function worldStep() {
//     }

//     function beginUnitSelection() {
//         unitSelection.x = mouseDownPosition.x
//         unitSelection.y = mouseDownPosition.y
//         unitSelection.visible = true
//     }

//     function updateUnitSelection() {
//         if (mouseDown) {
//             let diff = new Vec2(mousePosition.x - mouseDownPosition.x, mousePosition.y - mouseDownPosition.y)
//             if (diff.x < 0) {
//                 unitSelection.x = mousePosition.x
//             }
//             if (diff.y < 0) {
//                 unitSelection.y = mousePosition.y
//             }
//             unitSelection.width = Math.abs(diff.x)
//             unitSelection.height = Math.abs(diff.y)
//         }
//     }

//     function endUnitSelection() {
//         unitSelection.visible = false
//         unitSelection.width = 0
//         unitSelection.height = 0
//     }

//     function gatherInput(deltaTime: number) {
//         keyInput = new Vec2(0, 0)
//         if (keys.has("KeyA")) {
//             keyInput.x -= 1
//         }
//         if (keys.has("KeyD")) {
//             keyInput.x += 1
//         }
//         if (keys.has("KeyW")) {
//             keyInput.y -= 1
//         }
//         if (keys.has("KeyS")) {
//             app.stop()
//             keyInput.y += 1
//         }

//         let input = new Vec2(0, 0)

//         if (keyInput.x != 0 || keyInput.y != 0) {
//             moveToPosition = undefined
//             input.x = keyInput.x
//             input.y = keyInput.y
//         }
//         else {
//             if (moveToPosition != undefined) {
//                 let dir = Vec2.sub(moveToPosition, cameraWorldPosition)
//                 if (Vec2.lengthOf(dir) > 5) {
//                     dir = Vec2.normalize(dir)
//                     input.x = dir.x
//                     input.y = dir.y
//                 }
//                 else {
//                     moveToPosition = undefined
//                 }
//             }
//         }

//         input = Vec2.normalize(input)

//         cameraTargetPosition = Vec2.add(cameraTargetPosition, Vec2.multiply(input, cameraSpeed * deltaTime))
//     }
// }
