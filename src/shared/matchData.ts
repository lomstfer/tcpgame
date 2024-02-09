import { ClientInfo } from "./clientInfo"
import { Unit } from "./unit"

export class MatchData {
    otherClient: ClientInfo
    timeStarted: number
    team: boolean

    startSelfUnits: Unit[]
    startOtherUnits: Unit[]

    constructor(otherClient: ClientInfo, timeStarted: number, team: boolean, startSelfUnits: Unit[], startOtherUnits: Unit[]) {
        this.otherClient = otherClient
        this.timeStarted = timeStarted
        this.team = team
        this.startSelfUnits = startSelfUnits
        this.startOtherUnits = startOtherUnits
    }
}