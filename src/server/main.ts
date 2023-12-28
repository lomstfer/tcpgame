import { createServer } from "node:http"
import { handleHttp } from "./http-handler.js"
import { handleWS } from "./ws-handler.js"

const server = createServer()

handleHttp(server)
handleWS(server)

server.listen(80, () => {
    console.log("http/ws server running on port 80")
})