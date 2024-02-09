import * as NET from "./networking.js"
import * as PIXI from "pixi.js"
import * as CONSTS from "../shared/constants.js"
import * as GUTILS from "./gameUtils.js"
import * as GAME from "./game.js"
import { MatchData } from "../shared/matchData.js"
import { KeyInput } from "./keyInput.js"
import * as COLORS from "./colors.js"

const websocket = new WebSocket("ws://192.168.0.121:80")
NET.handleNetworking(websocket)

// PIXI.settings.ROUND_PIXELS = false
const pixiApp = new PIXI.Application<HTMLCanvasElement>({
    background: COLORS.BACKGROUND,
    width: CONSTS.GAME_WIDTH,
    height: CONSTS.GAME_HEIGHT,
    resizeTo: window,
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

// let visibilitychangeStart = performance.now()
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Tab is not visible')
        // visibilitychangeStart = performance.now()
    } else {
        console.log('Tab is visible')
        NET.sendGameStateRequest(websocket)
        // game?.handleVisibilityChange(performance.now() - visibilitychangeStart)
    }
})

let name = "me"

const gameUI = document.getElementById("game-ui")
const background = document.getElementById("background")

const findMatchForm = document.getElementById("find-match-inputs")
NET.netEventEmitter.on("allowFindMatch", allow => {
    /* if (allow)
        NET.findMatch(websocket, "player2") // for development speed */
        console.log("eeee")
    if (findMatchForm) {
        findMatchForm.style.display = allow ? "initial" : "none"
    }
})

const findMatchButton = document.getElementById("find-match-button")
findMatchButton?.addEventListener("click", () => {
    const nameInput = document.getElementById("find-match-name") as HTMLInputElement | null
    if (!nameInput) {
        return
    }
    name = nameInput.value
    NET.findMatch(websocket, nameInput.value)
})

const versusText = document.getElementById("versus-text")
const matchTime = document.getElementById("time")
NET.netEventEmitter.on("foundMatch", data => {
    enterMatch(data)
})

NET.netEventEmitter.on("matchWon", () => {
    endMatch(true)
})
NET.netEventEmitter.on("matchLost", () => {
    endMatch(false)
})

const matchEndedScreen = document.getElementById("match-ended-screen")
const matchEndedScreenResult = document.getElementById("match-ended-screen-result")
function endMatch(won: boolean) {
    
    if (matchEndedScreen) {
        if (matchEndedScreenResult) {
            matchEndedScreenResult.textContent = won ? "WINNER" : "LOOSER"
        }
        
        matchEndedScreen.style.display = "flex"
    }
}
const matchEndedScreenGotoMenu = document.getElementById("match-ended-screen-gotomenu")
matchEndedScreenGotoMenu?.addEventListener("click", () => {
    enterMenu()
})

function enterMatch(data: MatchData) {
    if (gameUI) {
        gameUI.style.display = "initial"
    }
    if (versusText) {
        if (data.team) {
            versusText.textContent = name + " VS " + data.otherClient.name
        }
        else {
            versusText.textContent = data.otherClient.name + " VS " + name
        }
    }
    if (background) {
        background.style.display = "none"
    }

    pixiApp.start()
    game = new GAME.GameInstance(pixiApp.stage, data, NET.getMatchTimeMS())
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
    if (matchEndedScreen) {
        if (matchEndedScreenResult) {
            matchEndedScreenResult.textContent = ""
        }
        
        matchEndedScreen.style.display = "none"
    }

    game?.stop()
    pixiApp.stop()
}

document.body.appendChild(pixiApp.view)

// pixiApp.stage.filters = []

const keyInput = new KeyInput()
let accumulator = 0
let game: GAME.GameInstance | undefined = undefined
pixiApp.ticker.add(() => {
    const dt = pixiApp.ticker.deltaMS / 1000
    
    if (matchTime) {
        let milliseconds = Math.floor(NET.getMatchTimeMS())
        let seconds = Math.floor(milliseconds / 1000)
        let minutes = Math.floor(seconds / 60)
        seconds = seconds % 60
        milliseconds = milliseconds % 1000
        matchTime.textContent = `${minutes}:${seconds}:${Math.floor(milliseconds/100)}`
    }

    game?.update(dt*1000, NET.getMatchTimeMS(), keyInput)
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

NET.netEventEmitter.on("spawnServerUnitSelf", data => {
    game?.spawnUnitSelf(data[0], data[1])
})
NET.netEventEmitter.on("spawnServerUnitOther", data => {
    game?.spawnUnitOther(data[0], data[1])
})
NET.netEventEmitter.on("serverUnitsUpdate", data => {
    game?.handleServerUnitsUpdate(data[0], data[1])
})
NET.netEventEmitter.on("killUnit", id => {
    game?.killUnit(id)
})
NET.netEventEmitter.on("serverGameStateRespone", data => {
    game?.handleServerGameStateResponse(NET.getMatchTimeMS() - data.timeOfSnapshot, data.units, data.unitsToPlace, data.movesLeft)
})
