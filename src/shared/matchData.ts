import { ClientInfo } from "./clientInfo";

export class MatchData {
    otherClient: ClientInfo

    constructor(otherClient: ClientInfo) {
        this.otherClient = otherClient
    }
}