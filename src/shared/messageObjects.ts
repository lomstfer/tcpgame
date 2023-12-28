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