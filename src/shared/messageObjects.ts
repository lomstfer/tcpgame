import { ClientInfo } from "./clientInfo"
import { MatchData } from "./matchData"
import { Unit } from "./unit"
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

export class ServerPing {
    sentFromServerTime: number
    constructor(sentFromServerTime: number) {
        this.sentFromServerTime = sentFromServerTime
    }
}

export class ClientPong {
    sentFromServerTime: number
    constructor(sentFromServerTime: number) {
        this.sentFromServerTime = sentFromServerTime
    }
}

export class ClientSpawnUnitRequest {
    position: Vec2
    constructor(position: Vec2) {
        this.position = position
    }
}

export class CommandTimeData {
    timeSent: number
    timeToExecute: number
    constructor(timeSent: number, timeToExecute: number) {
        this.timeSent = timeSent
        this.timeToExecute = timeToExecute
    }
}

export class ServerSpawnUnitSelf {
    unit: Unit
    timeData: CommandTimeData
    constructor(unit: Unit, timeData: CommandTimeData) {
        this.unit = unit
        this.timeData = timeData
    }
}

export class ServerSpawnUnitOther {
    unit: Unit
    timeData: CommandTimeData
    constructor(unit: Unit, timeData: CommandTimeData) {
        this.unit = unit
        this.timeData = timeData
    }
}

export class ClientMoveUnits {
    unitIds: string[]
    position: Vec2
    constructor(unitIds: string[], position: Vec2) {
        this.unitIds = unitIds
        this.position = position
    }
}

export class ServerUnitsUpdate {
    units: Unit[]
    timeData: CommandTimeData
    constructor(units: Unit[], timeData: CommandTimeData) {
        this.units = units
        this.timeData = timeData
    }
}

export class ServerKillUnit {
    unitId: string
    constructor(unitId: string) {
        this.unitId = unitId
    }
}