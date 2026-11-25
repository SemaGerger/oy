import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";
import {
  registerLocalUser,
  loginLocalUser,
  loginOrRegisterGoogleUser,
  verifyAuthToken,
} from "./auth/authService";

const port = Number(process.env.PORT || 2567);
const app = express();

// Security headers middleware
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Controlled CORS and strict JSON body size limit (10kb)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",") : true,
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "10kb" }));

// Brute-force / Auth Rate Limiter (Max 12 auth attempts per minute per IP)
const authAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = authAttemptsByIp.get(ip);
  if (!record || now > record.resetAt) {
    authAttemptsByIp.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  record.count += 1;
  return record.count <= 12;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

// 1. Register Endpoint
app.post("/api/auth/register", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkAuthRateLimit(ip)) {
    res.status(429).json({ ok: false, error: "Çok fazla deneme yaptınız. Lütfen 1 dakika bekleyin." });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ ok: false, error: "Geçersiz istek gövdesi." });
    return;
  }

  const result = registerLocalUser(body.username, body.email, body.password);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// 2. Login Endpoint
app.post("/api/auth/login", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkAuthRateLimit(ip)) {
    res.status(429).json({ ok: false, error: "Çok fazla deneme yaptınız. Lütfen 1 dakika bekleyin." });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ ok: false, error: "Geçersiz istek gövdesi." });
    return;
  }

  const result = loginLocalUser(body.identifier, body.password);
  if (!result.ok) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

// 3. Google Sign-In Endpoint
app.post("/api/auth/google", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkAuthRateLimit(ip)) {
    res.status(429).json({ ok: false, error: "Çok fazla deneme yaptınız. Lütfen 1 dakika bekleyin." });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ ok: false, error: "Geçersiz istek gövdesi." });
    return;
  }

  const result = await loginOrRegisterGoogleUser(body.idToken);
  if (!result.ok) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

// 4. Verify Current Session Token
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Oturum bulunamadı." });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, error: "Oturum süresi dolmuş veya geçersiz." });
    return;
  }
  res.json({
    ok: true,
    user: {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
    },
  });
});

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    maxPayload: 4096, // 4KB max WebSocket frame size against memory DoS attacks
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// Register the GameRoom
gameServer.define("game_room", GameRoom);

server.listen(port, () => {
  console.log(`⚔️  Colyseus Game Server & Auth API running on http://localhost:${port}`);
  console.log(`📡 Health check at http://localhost:${port}/health`);
});
