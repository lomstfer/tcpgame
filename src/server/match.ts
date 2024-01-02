import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"
import { Vec2 } from '../shared/utils.js'
import * as MSG from "../shared/messageStuff.js"
import * as MSGOBJS from "../shared/messageObjects.js"
import * as SUTILS from "./serverUtils.js"
import { Unit } from "../shared/unit.js"

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

    client1Socket: WebSocketWithId
    client2Socket: WebSocketWithId
    client1Info: ClientInfo
    client2Info: ClientInfo

    client1Units: Unit[] = []
    client2Units: Unit[] = []

    constructor(id: string, client1Socket: WebSocketWithId, client2Socket: WebSocketWithId, client1Info: ClientInfo, client2Info: ClientInfo) {
        this.id = id

        this.client1Socket = client1Socket
        this.client2Socket = client2Socket
        this.client1Info = client1Info
        this.client2Info = client2Info
    }

    simulate(deltaTime: number) {

    }

    disconnectClient(id: string) {
        if (id == this.client1Socket.id) {
            console.log(this.client1Info.name, "disconnected")
            this.client2Socket.socket.send(MSG.getByteFromMessage(MSG.MessageID.serverOpponentDisconnected))
        }
        else if (id == this.client2Socket.id) {
            console.log(this.client2Info.name, "disconnected")
            this.client1Socket.socket.send(MSG.getByteFromMessage(MSG.MessageID.serverOpponentDisconnected))
        }
    }

    spawnUnit(ownerId: string, position: Vec2) {
        const unit = new Unit(SUTILS.generateRandomID(), position)
        
        const selfBytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverSpawnUnitSelf, new MSGOBJS.ServerSpawnUnitSelf(unit))
        const otherBytes = MSG.getBytesFromMessageAndObj(MSG.MessageID.serverSpawnUnitOther, new MSGOBJS.ServerSpawnUnitOther(unit))

        if (ownerId == this.client1Socket.id) {
            this.client1Units.push(unit)
            this.client1Socket.socket.send(selfBytes)
            this.client2Socket.socket.send(otherBytes)
        }
        else if (ownerId == this.client2Socket.id) {
            this.client2Units.push(unit)
            this.client2Socket.socket.send(selfBytes)
            this.client1Socket.socket.send(otherBytes)
        }
    }

    sendBytesToAll(bytes: Uint8Array) {
        this.client1Socket.socket.send(bytes)
        this.client2Socket.socket.send(bytes)
    }

    ready() {

    }
}