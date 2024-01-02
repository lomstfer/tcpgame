import { ClientInfo } from "./clientInfo"

export class MatchData {
    otherClient: ClientInfo
    timeStarted: number
    team: boolean

    constructor(otherClient: ClientInfo, timeStarted: number, team: boolean) {
        this.otherClient = otherClient
        this.timeStarted = timeStarted
        this.team = team
    }
}