import * as NET from "./networking.js"
// import * as GAME from "./game.js"
import * as PIXI from "pixi.js"
import * as CONSTS from "../shared/constants.js"
import * as UTILS from "../shared/utils.js"
import { ClientInfo } from "../shared/clientInfo.js"

const websocket = new WebSocket("ws://83.253.223.167:80")
NET.handleNetworking(websocket)

let name = ""

const findMatchForm = document.getElementById("find-match-inputs")
NET.netEventEmitter.on("allowFindMatch", allow => {
    if (findMatchForm) {
        findMatchForm.style.display = allow ? "initial" : "none"
    }
    const timeEl = document.getElementById("time")!
    pixiApp.ticker.add(() => {
        timeEl.textContent = NET.getServerTime().toFixed(1)
    })
})

const findMatchButton = document.getElementById("find-match-button")
findMatchButton?.addEventListener("click", () => {
    const nameInput = document.getElementById("find-match-name") as HTMLInputElement
    if (!nameInput) {
        return
    }
    name = nameInput.value
    NET.findMatch(websocket, nameInput.value)
})

const versusText = document.getElementById("versus-text")
NET.netEventEmitter.on("foundMatch", data => {
    if (versusText) {
        versusText.textContent = name + " VS " + data.otherClient.name
    }
})

const pixiApp = new PIXI.Application<HTMLCanvasElement>({
    background: '#335935',
    width: CONSTS.GAME_WIDTH,
    height: CONSTS.GAME_HEIGHT,
    resizeTo: window,
    antialias: true,
    backgroundAlpha: 1,
    eventMode: "static"
})


// // document.body.appendChild(app.view)

// const keys = new Set<string>()

// document.addEventListener("keydown", (event) => {
//     keys.add(event.code)
// })
// document.addEventListener("keyup", (event) => {
//     keys.delete(event.code)
// })
// window.addEventListener("blur", () => {
//     keys.clear()
// })

// window.addEventListener("resize", () => {
//     handleResize()
// })
// function handleResize() {
//     UTILS.scaleAndCenter(app.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
//     keys.clear()
// }

// UTILS.scaleAndCenter(app.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)

// GAME.startGame(app)