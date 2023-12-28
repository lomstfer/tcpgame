import { WebSocket } from 'ws'
import { ClientInfo } from "../shared/clientInfo.js"

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
        if (id == this.client1Socket.id)
            console.log(this.client1Info.name, "disconnected")
        else if (id == this.client2Socket.id)
            console.log(this.client2Info.name, "disconnected")
    }

    ready() {
        
    }
}