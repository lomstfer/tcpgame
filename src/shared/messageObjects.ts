import { ClientInfo } from "./clientInfo"
import { MatchData } from "./matchData"
import { Vec2 } from "./utils"

export class ClientEnterMatchFinder {
    info: ClientInfo
    constructor(info: ClientInfo) {
        this.info = info
    }
}

export class ServerFoundMatch {
    data: MatchData
    constructor(data: MatchData) {
        this.data = data
    }
}

export class ClientTimeRequest {
    clientTime: number
    constructor(clientTime: number) {
        this.clientTime = clientTime
    }
}

export class ServerTimeAnswer {
    clientTime: number
    serverTime: number
    constructor(clientTime: number, serverTime: number) {
        this.clientTime = clientTime
        this.serverTime = serverTime
    }
}

export class ClientSpawnUnit {
    position: Vec2
    constructor(position: Vec2) {
        this.position = position
    }
}

export class ServerSpawnUnit {
    position: Vec2
    constructor(position: Vec2) {
        this.position = position
    }
}