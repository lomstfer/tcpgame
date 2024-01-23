import * as NET from "./networking.js"
import * as PIXI from "pixi.js"
import * as CONSTS from "../shared/constants.js"
import * as GUTILS from "./gameUtils.js"
import * as GAME from "./game.js"
import { MatchData } from "../shared/matchData.js"
import { KeyInput } from "./keyInput.js"

const websocket = new WebSocket("ws://192.168.0.121:80")
NET.handleNetworking(websocket)

// PIXI.settings.ROUND_PIXELS = false
const pixiApp = new PIXI.Application<HTMLCanvasElement>({
    background: '#55575c',
    width: CONSTS.GAME_WIDTH,
    height: CONSTS.GAME_HEIGHT,
    resizeTo: window,
    antialias: true,
    backgroundAlpha: 1,
    eventMode: "static",
    autoStart: false,
})

window.addEventListener("resize", () => {
    GUTILS.scaleAndCenter(pixiApp.stage, CONSTS.GAME_WIDTH, CONSTS.GAME_HEIGHT)
})
document.addEventListener("contextmenu", (event) => {
    event.preventDefault()
})

let name = ""

const gameUI = document.getElementById("game-ui")
const background = document.getElementById("background")

const findMatchForm = document.getElementById("find-match-inputs")
NET.netEventEmitter.on("allowFindMatch", allow => {
    if (allow)
        NET.findMatch(websocket, "nameo") // for development speed
    /* if (findMatchForm) {
        findMatchForm.style.display = allow ? "initial" : "none"
    } */
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
    game = new GAME.GameInstance(pixiApp.stage, data)
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

    game?.stop()
    pixiApp.stop()
}

document.body.appendChild(pixiApp.view)

const keyInput = new KeyInput()
let accumulator = 0
let game: GAME.GameInstance | undefined = undefined
pixiApp.ticker.add(() => {
    const dt = pixiApp.ticker.deltaMS / 1000
    
    if (timeEl) {
        timeEl.textContent = (NET.getMatchTimeMS() / 1000).toFixed(1)
    }

    game?.update(dt, NET.getMatchTimeMS(), keyInput)
    accumulator += dt
    while (accumulator >= CONSTS.WORLD_UPDATE_S) {
        game?.fixedUpdate()
        accumulator -= CONSTS.WORLD_UPDATE_S
    }
    game?.interpolate(accumulator / CONSTS.WORLD_UPDATE_S)
    
    keyInput.updateLastKeys()
})

GAME.gameEventEmitter.on("spawnUnitCommand", position => {
    NET.sendSpawnUnit(websocket, position)
})
GAME.gameEventEmitter.on("moveUnitsCommand", data => {
    NET.sendMoveUnits(websocket, data)
})

NET.netEventEmitter.on("spawnServerUnitSelf", unit => {
    game?.spawnUnitSelf(unit)
})
NET.netEventEmitter.on("spawnServerUnitOther", unit => {
    game?.spawnUnitOther(unit)
})
NET.netEventEmitter.on("serverUnitsUpdate", data => {
    game?.handleServerUpdate(data[0], data[1], data[2])
})
