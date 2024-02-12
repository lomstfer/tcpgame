import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"
import { Vec2 } from '../shared/utils.js'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import { Unit } from "../shared/unit.js"
import * as CONSTS from "../shared/constants.js"
import * as SCONSTS from "./serverConstants.js"
import { SocketData } from './socketData.js'
import { UnitHandler } from './unitHandler.js'

export class WebSocketWithId {
    socket: WebSocket
    id: string
    constructor(socket: WebSocket, id: string) {
        this.socket = socket
        this.id = id
    }
}

export class Match {
    id: string

    client1Socket: SocketData
    client2Socket: SocketData
    client1Info: ClientInfo
    client2Info: ClientInfo

    dateTimeStarted: number

    unitHandler: UnitHandler

    matchEnded = false

    rematchState: number = 0 // 2 == rematch

    constructor(id: string, client1Socket: SocketData, client2Socket: SocketData, client1Info: ClientInfo, client2Info: ClientInfo) {
        this.id = id
        this.dateTimeStarted = Date.now()

        this.client1Socket = client1Socket
        this.client2Socket = client2Socket
        this.client1Info = client1Info
        this.client2Info = client2Info

        this.client1Socket.socket.on('message', (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageId = MSG.getMessageIdFromBytes(bytes)
            this.handleMessage(bytes, messageId, this.client1Socket.id)
        })
        this.client2Socket.socket.on('message', (data) => {
            const bytes = new Uint8Array(data as ArrayBuffer)
            const messageId = MSG.getMessageIdFromBytes(bytes)
            this.handleMessage(bytes, messageId, this.client2Socket.id)
        })

        this.unitHandler = new UnitHandler(this.client1Socket.id, this.client2Socket.id)
        this.unitHandler.unitsEventEmitter.on("sendDeleteUnit", (id) => {
            this.sendDeleteUnit(id)
        })
        this.unitHandler.unitsEventEmitter.on("clientNoUnitsAlive", (id) => {
            if (id == this.client1Socket.id) {
                this.endMatchWithWinner(this.client2Socket.id)
            }
            else if (id == this.client2Socket.id) {
                this.endMatchWithWinner(this.client1Socket.id)
            }
        })
    }

    handleMessage(bytes: Uint8Array, messageId: MSG.MessageId, clientId: string) {
        switch (messageId) {
            case MSG.MessageId.clientMatchSpawnUnit: {
                if (this.matchEnded) {
                    break
                }
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientSpawnUnitRequest>(bytes)
                if (msgObj == undefined) {
                    break
                }

                const spawned = this.unitHandler.trySpawnUnit(clientId, msgObj.position, this.getMatchTime(), this.getInputDelay())
                if (spawned != undefined) {
                    this.client1Socket.socket.send(spawned[0])
                    this.client2Socket.socket.send(spawned[1])
                }

                break
            }
            case MSG.MessageId.clientMatchMoveUnits: {
                if (this.matchEnded) {
                    break
                }
                const msgObj = MSG.getObjectFromBytes<MSGOBJS.ClientMoveUnits>(bytes)
                if (msgObj == undefined) {
                    break
                }
                this.unitHandler.tryMoveUnits(clientId, msgObj.unitIds, msgObj.position, this.getInputDelay())
                this.sendUnitsUpdate()
                break
            }
            case MSG.MessageId.clientGameStateRequest: {
                this.sendGameStateResponse(clientId)
                break
            }
        }
    }

    spawnStartUnits(client1Team: boolean): [Unit[], Unit[]] {
        const units1: Unit[] = []
        const units2: Unit[] = []
        const left = new Vec2(-CONSTS.START_DISTANCE, 0)
        const right = new Vec2(CONSTS.START_DISTANCE, 0)
        {
            const unit = this.unitHandler.spawnUnitForFree(this.client1Socket.id, client1Team ? left : right)
            if (unit) {
                units1.push(unit)
            }
        }
        {
            const unit = this.unitHandler.spawnUnitForFree(this.client2Socket.id, client1Team ? right : left)
            if (unit) {
                units2.push(unit)
            }
        }
        return [units1, units2]
    }

    getMatchTime(): number {
        return Date.now() - this.dateTimeStarted
    }

    simulate(deltaTime: number) {
        if (this.matchEnded) {
            return
        }
        this.unitHandler.simulate()
    }

    sendBytesToAll(bytes: Uint8Array) {
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    sendUnitsUpdate() {
        const units = this.unitHandler.consumeAlreadyUpdatedUnits()
        if (units.length == 0) {
            return
        }

        const delay = this.getInputDelay()
        // console.log("delay:", delay)
        const matchTime = this.getMatchTime()
        const obj = new MSGOBJS.ServerUnitsUpdate(units, new MSGOBJS.CommandTimeData(matchTime, matchTime + delay))
        const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverUnitsUpdate, obj)
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    sendDeleteUnit(unitId: string) {
        const bytes = MSG.getBytesFromMessageAndObj(MSG.MessageId.serverKillUnit, new MSGOBJS.ServerKillUnit(unitId))
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    getHighestPing(): number | undefined {
        if (this.client1Socket.ping == undefined || this.client2Socket.ping == undefined) {
            return
        }
        if (this.client1Socket.ping >= this.client2Socket.ping) {
            return this.client1Socket.ping
        }
        return this.client2Socket.ping
    }

    getHighestOneWayLatency(): number | undefined {
        const ping = this.getHighestPing()
        if (ping != undefined) {
            return ping / 2
        }
        return undefined
    }

    getInputDelay(): number {
        let delay = this.getHighestPing()
        if (delay == undefined || delay < SCONSTS.INPUT_DELAY_MINIMUM_MS) {
            return SCONSTS.INPUT_DELAY_MINIMUM_MS
        }
        return delay/* SCONSTS.INPUT_DELAY_MINIMUM_MS */
    }

    sendGameStateResponse(clientId: string) {
        let units: Unit[] = Array.from(this.unitHandler.client1Units.values()).concat(Array.from(this.unitHandler.client2Units.values()))
        let unitsToPlace: number = 0
        let movesLeft: number = 0
        let socket: WebSocket | undefined
        if (clientId == this.client1Socket.id) {
            unitsToPlace = this.unitHandler.client1UnitsRemaining
            movesLeft = this.unitHandler.client1MovesRemaining
            socket = this.client1Socket.socket
        }
        else if (clientId == this.client2Socket.id) {
            unitsToPlace = this.unitHandler.client2UnitsRemaining
            movesLeft = this.unitHandler.client2MovesRemaining
            socket = this.client2Socket.socket
        }
        const obj = new MSGOBJS.ServerGameStateResponse(this.getMatchTime(), units, unitsToPlace, movesLeft)
        socket?.send(MSG.getBytesFromMessageAndObj(MSG.MessageId.serverGameStateResponse, obj))
    }

    endMatchWithWinner(winnerId: string) {
        this.matchEnded = true
        
        if (winnerId == this.client1Socket.id) {
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverYouWon))
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverYouLost))
        }
        else if (winnerId == this.client2Socket.id) {
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverYouWon))
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverYouLost))
        }
    }

    disconnectClient(id: string) {
        if (id == this.client1Socket.id) {
            console.log(this.client1Info.name, "disconnected")
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverOpponentDisconnected))
            if (this.matchEnded == false)
                this.endMatchWithWinner(this.client2Socket.id)
        }
        else if (id == this.client2Socket.id) {
            console.log(this.client2Info.name, "disconnected")
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageId.serverOpponentDisconnected))
            if (this.matchEnded == false)
                this.endMatchWithWinner(this.client1Socket.id)
        }
    }
}