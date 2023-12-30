import * as NET from "./networking.js"
import * as PIXI from "pixi.js"
import * as CONSTS from "../shared/constants.js"
import * as UTILS from "../shared/utils.js"
import * as GUTILS from "./gameUtils.js"
import { MatchVisualizer } from "./game.js"
import { ClientInfo } from "../shared/clientInfo.js"
import { MatchData } from "../shared/matchData.js"

const websocket = new WebSocket("ws://80.217.244.14:80")
NET.handleNetworking(websocket)

const pixiApp = new PIXI.Application<HTMLCanvasElement>({
    background: '#335935',
    width: CONSTS.GAME_WIDTH,
    height: CONSTS.GAME_HEIGHT,
    resizeTo: window,
    antialias: true,
    backgroundAlpha: 1,
    eventMode: "static",
    autoStart: false,
})

let name = ""

const gameUI = document.getElementById("game-ui")
const background = document.getElementById("background")

const findMatchForm = document.getElementById("find-match-inputs")
NET.netEventEmitter.on("allowFindMatch", allow => {
    if (findMatchForm) {
        findMatchForm.style.display = allow ? "initial" : "none"
    }
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
const timeEl = document.getElementById("time")
NET.netEventEmitter.on("foundMatch", data => {
    enterMatch(data)
})

NET.netEventEmitter.on("matchWon", () => {
    enterMenu()
})

function enterMatch(data: MatchData) {
    if (gameUI) {
        gameUI.style.display = "initial"
    }
    if (versusText) {
        versusText.textContent = name + " VS " + data.otherClient.name
    }
    if (background) {
        background.style.display = "none"
    }

    pixiApp.start()
    matchVisualizer.start(pixiApp.stage, data)
    GUTILS.scaleAndCenter(pixiApp.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
}

function enterMenu() {
    if (findMatchForm) {
        findMatchForm.style.display = "initial"
    }
    if (gameUI) {
        gameUI.style.display = "none"
    }
    if (background) {
        background.style.display = "initial"
    }

    matchVisualizer.stop(pixiApp.stage)
    pixiApp.stop()
}

document.body.appendChild(pixiApp.view)

const keys = new Set<string>()

document.addEventListener("keydown", (event) => {
    keys.add(event.code)
})
document.addEventListener("keyup", (event) => {
    keys.delete(event.code)
})
window.addEventListener("blur", () => {
    keys.clear()
})

const matchVisualizer = new MatchVisualizer()
pixiApp.ticker.add(() => {
    const dt = pixiApp.ticker.deltaMS / 1000
    console.log(dt)

    if (timeEl) {
        timeEl.textContent = (NET.getMatchTime() / 1000).toFixed(1)
    }

    matchVisualizer.update(dt, keys)
})

window.addEventListener("resize", () => {
    handleResize()
})
function handleResize() {
    GUTILS.scaleAndCenter(pixiApp.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
    keys.clear()
}


// GAME.startGame(app)