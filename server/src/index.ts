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
  initAuthStore,
  isAuthSecretConfigured,
  persistentStoreKind,
} from "./auth/authService";

const port = Number(process.env.PORT || 2567);
const app = express();

// Render / Cloudflare gibi ters proxy arkasında gerçek istemci IP'sini al.
// (Aksi halde tüm kullanıcılar aynı proxy IP'sini paylaşır ve rate-limit herkesi birden kilitler.)
app.set("trust proxy", 1);

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
    origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim()) : true,
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "10kb" }));

// Brute-force / Auth Rate Limiter (Max 20 auth attempts per minute per IP)
const authAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = authAttemptsByIp.get(ip);
  if (!record || now > record.resetAt) {
    authAttemptsByIp.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  record.count += 1;
  return record.count <= 20;
}

// Süresi dolmuş rate-limit kayıtlarını temizle (bellek sızıntısını önler)
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of authAttemptsByIp) {
    if (now > rec.resetAt) authAttemptsByIp.delete(ip);
  }
}, 120_000).unref();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    time: Date.now(),
    // Hassas olmayan teşhis bilgileri (giriş sorunlarını hızlı tespit için)
    auth: {
      secretConfigured: isAuthSecretConfigured,
      store: persistentStoreKind,
      googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    },
  });
});

type AuthHandler = (body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;

/** Ortak auth uç noktası: rate-limit + gövde doğrulama + hata yakalama */
function authEndpoint(path: string, failStatus: number, handler: AuthHandler) {
  app.post(path, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkAuthRateLimit(ip)) {
      res.status(429).json({ ok: false, error: "Çok fazla deneme yaptınız. Lütfen 1 dakika bekleyin." });
      return;
    }
    const body: unknown = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ ok: false, error: "Geçersiz istek gövdesi." });
      return;
    }
    try {
      const result = await handler(body as Record<string, unknown>);
      res.status(result.ok ? 200 : failStatus).json(result);
    } catch (err) {
      console.error(`[AUTH] ${path} hata:`, err);
      res.status(500).json({ ok: false, error: "Sunucu hatası oluştu. Lütfen tekrar deneyin." });
    }
  });
}

// 1. Register
authEndpoint("/api/auth/register", 400, (b) => registerLocalUser(b.username, b.email, b.password));
// 2. Login
authEndpoint("/api/auth/login", 401, (b) => loginLocalUser(b.identifier, b.password));
// 3. Google Sign-In
authEndpoint("/api/auth/google", 401, (b) => loginOrRegisterGoogleUser(b.idToken));

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

// Bozuk JSON gövdesi gibi hatalar HTML yerine JSON döndürsün (istemci her zaman parse edebilsin)
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      error: status === 413 ? "İstek çok büyük." : "Geçersiz istek.",
    });
  }
);

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

// Kullanıcı deposu yüklendikten sonra dinlemeye başla (soğuk açılışta "kullanıcı bulunamadı" hatası olmasın)
initAuthStore()
  .catch((err) => console.error("[AUTH] Depo başlatılamadı:", err))
  .finally(() => {
    server.listen(port, () => {
      console.log(`⚔️  Colyseus Game Server & Auth API running on http://localhost:${port}`);
      console.log(`📡 Health check at http://localhost:${port}/health`);
    });
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
