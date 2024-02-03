import { CommandTimeData } from "../shared/messageObjects"

export class ExecuteDelayData {
    timeSinceSent: number
    timeUntilExecute: number

    constructor(timeSinceSent: number, timeUntilExecute: number) {
        this.timeSinceSent = timeSinceSent
        this.timeUntilExecute = timeUntilExecute
    }

    static fromReceivedTimeData(currentTime: number, timeData: CommandTimeData): ExecuteDelayData {
        return new ExecuteDelayData(currentTime - timeData.timeSent, timeData.timeToExecute - currentTime)
    }
}