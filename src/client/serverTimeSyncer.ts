import * as UTILS from "../shared/utils.js"

export class ServerTimeSyncer {
    latencyArray: number[] = []
    clientServerTimeDiff = Date.now()
    timeSynced = false

    handleServerTimeUpdate(clientTime: number, serverTime: number) {
        const latency = (Date.now() - clientTime) / 2
        console.log(latency)
        this.latencyArray.push(latency)
        
        let difference: number = Date.now() - (serverTime + latency)

        if (this.latencyArray.length > 10 && !this.timeSynced) {
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