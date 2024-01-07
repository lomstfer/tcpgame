import { WebSocket } from 'ws'
import * as UTILS from "../shared/utils.js"

export class SocketData {
    socket: WebSocket
    id: string
    ping: number | undefined

    private latestPings: number[] = []

    constructor(socket: WebSocket, id: string) {
        this.socket = socket
        this.id = id
    }

    handleClientPong(sentTime: number, currentServerTime: number) {
        const ping = currentServerTime - sentTime
        // this.ping = ping
        this.latestPings.push(ping)
        if (this.latestPings.length > 5) {
            this.latestPings.splice(0, 1)
            
            const sortedPings =  [...this.latestPings].sort((a, b) => a - b)
            const average = UTILS.getAverageCloseToMedian(sortedPings, 1)
            if (isNaN(average)) {
                this.ping = undefined
            }
            else {
                this.ping = average
            }
        }
        else {
            this.ping = ping
        } 
        console.log("r: ", ping, "avg: ", this.ping)
    }
}