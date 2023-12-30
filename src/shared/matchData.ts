import { ClientInfo } from "./clientInfo";

export class MatchData {
    otherClient: ClientInfo
    timeStarted: number

    constructor(otherClient: ClientInfo, timeStarted: number) {
        this.otherClient = otherClient
        this.timeStarted = timeStarted
    }
}