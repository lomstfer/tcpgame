import { createServer } from "node:https"
import { handleHttp } from "./http-handler.js"
import { handleWS } from "./ws-handler.js"
import fs from "fs"

const options = {
    key: fs.readFileSync("127.0.0.1-key.pem"),
    cert: fs.readFileSync("127.0.0.1.pem"),
}
const server = createServer(options)

handleHttp(server)
handleWS(server)

server.listen(443, () => {
    console.log("http/ws server running on port 80")
})