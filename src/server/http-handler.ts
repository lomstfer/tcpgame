import { Server } from "node:http"
import express from "express"

export function handleHttp(server: Server) {
    const app = express()
    server.on("request", app)

    // app.use(bodyParser.urlencoded({ extended: true }))
    app.use("/public", express.static("./public/"))

    app.get("/", (req, res) => {
        res.sendFile("game.html", { root: "public" })
    })
}   