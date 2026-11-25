import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server
  })
});

// Register the GameRoom
gameServer.define("game_room", GameRoom);

server.listen(port, () => {
  console.log(`⚔️  Colyseus Game Server running on ws://localhost:${port}`);
  console.log(`📡 Health check at http://localhost:${port}/health`);
});
