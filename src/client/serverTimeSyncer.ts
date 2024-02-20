import * as UTILS from "../shared/utils.js"
import { TIME_SYNCS_TO_DO } from "./networking.js"

export class ServerTimeSyncer {
    latencyArray: number[] = []
    clientServerTimeDiff = Date.now()
    timeSynced = false

    handleServerTimeUpdate(clientTime: number, serverTime: number) {
        const latency = (Date.now() - clientTime) / 2
        this.latencyArray.push(latency)
        
        let difference: number = Date.now() - (serverTime + latency)

        if (this.latencyArray.length > TIME_SYNCS_TO_DO && !this.timeSynced) {
            this.latencyArray.sort((a, b) => a - b)
            const median = UTILS.getMedian(this.latencyArray)
            const avgDiff = UTILS.getAverageDiffFromMedian(this.latencyArray, median)
            const resultArray = this.latencyArray.filter((v) => Math.abs(v - median) <= avgDiff)
            const average = UTILS.getAverage(resultArray)
            
            difference = Date.now() - (serverTime + average)
            if (avgDiff < 700) {
                this.timeSynced = true
            }
        }
    
        this.clientServerTimeDiff = difference
    }

    getServerTime(): number {
        return Date.now() - this.clientServerTimeDiff
    }
}