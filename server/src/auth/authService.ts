import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  provider: "local" | "google";
  createdAt: number;
  totalScore: number;
  totalKills: number;
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  email: string;
  exp: number;
}

type AuthResult = {
  ok: boolean;
  error?: string;
  token?: string;
  user?: { id: string; username: string; email: string };
};

const RESERVED_NAMES = ["sistem", "system", "admin", "moderator", "sunucu", "server"];
const DATA_DIR = path.join(__dirname, "../../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET_FILE = path.join(DATA_DIR, "secret.key");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const isAuthSecretConfigured = Boolean(
  process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
);

function getOrCreateSecret(): string {
  if (isAuthSecretConfigured) {
    return process.env.AUTH_SECRET as string;
  }
  console.warn(
    "[AUTH] ⚠ AUTH_SECRET ortam değişkeni yok/kısa. Geçici dosya anahtarı kullanılıyor; " +
      "sunucu yeniden başlarsa tüm oturumlar düşer. Render'da AUTH_SECRET (>=32 karakter) tanımlayın."
  );
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, "utf8").trim();
  }
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, generated, { encoding: "utf8", mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getOrCreateSecret();

/* ------------------------------------------------------------------ */
/*  Kalıcı Depolama Katmanı                                            */
/*  - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN varsa: Redis   */
/*    (Render ücretsiz planında disk geçicidir; hesaplar kaybolmaz)    */
/*  - Yoksa: yerel JSON dosyası (geliştirme ortamı)                    */
/* ------------------------------------------------------------------ */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "") || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
const REDIS_HASH_KEY = "sitecont:users";
export const persistentStoreKind: "redis" | "file" = REDIS_URL && REDIS_TOKEN ? "redis" : "file";

async function redisCommand(args: string[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(REDIS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
    const data = (await resp.json()) as { result?: unknown; error?: string };
    if (!resp.ok || data.error) {
      throw new Error(data.error || `Redis HTTP ${resp.status}`);
    }
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

function isValidStoredUser(u: unknown): u is StoredUser {
  if (!u || typeof u !== "object") return false;
  const r = u as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.username === "string" && typeof r.email === "string";
}

const usersById = new Map<string, StoredUser>();

function loadUsersFromFile(): void {
  try {
    if (!fs.existsSync(USERS_FILE)) return;
    const arr = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as unknown;
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (isValidStoredUser(u)) usersById.set(u.id, u);
      }
    }
  } catch (err) {
    console.error("[AUTH] users.json okunamadı:", err);
  }
}

function saveUsersToFile(): void {
  const arr = Array.from(usersById.values());
  const tmp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE); // atomik yazım: yarım dosya oluşmaz
}

async function persistUser(user: StoredUser): Promise<void> {
  if (persistentStoreKind === "redis") {
    await redisCommand(["HSET", REDIS_HASH_KEY, user.id, JSON.stringify(user)]);
  } else {
    saveUsersToFile();
  }
}

let storeReady: Promise<void> | null = null;

/** Sunucu dinlemeye başlamadan önce çağrılır; kullanıcıları belleğe yükler. */
export function initAuthStore(): Promise<void> {
  if (storeReady) return storeReady;
  storeReady = (async () => {
    if (persistentStoreKind === "redis") {
      try {
        const flat = (await redisCommand(["HGETALL", REDIS_HASH_KEY])) as unknown;
        if (Array.isArray(flat)) {
          for (let i = 0; i + 1 < flat.length; i += 2) {
            try {
              const u = JSON.parse(String(flat[i + 1])) as unknown;
              if (isValidStoredUser(u)) usersById.set(u.id, u);
            } catch {
              // bozuk kayıt atlanır
            }
          }
        }
        console.log(`[AUTH] Redis kalıcı depo aktif — ${usersById.size} kullanıcı yüklendi.`);
      } catch (err) {
        console.error("[AUTH] Redis'e bağlanılamadı, kullanıcılar yüklenemedi:", err);
      }
    } else {
      loadUsersFromFile();
      console.warn(
        `[AUTH] Dosya deposu kullanılıyor (${usersById.size} kullanıcı). ` +
          "Render ücretsiz planında disk geçicidir — kalıcılık için UPSTASH_REDIS_REST_URL/TOKEN tanımlayın."
      );
    }
  })();
  return storeReady;
}

/* ------------------------------------------------------------------ */
/*  Doğrulama                                                          */
/* ------------------------------------------------------------------ */

export function validateUsername(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Kullanıcı adı metin olmalıdır." };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 15) {
    return { valid: false, value: "", error: "Kullanıcı adı 3 ile 15 karakter arasında olmalıdır." };
  }
  if (!/^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/.test(trimmed)) {
    return {
      valid: false,
      value: "",
      error: "Kullanıcı adı yalnızca harf, rakam ve alt çizgi (_) içerebilir (boşluk olmamalı).",
    };
  }
  const lower = trimmed.toLocaleLowerCase("tr");
  if (RESERVED_NAMES.some((r) => lower === r || lower.startsWith(r))) {
    return { valid: false, value: "", error: "Bu kullanıcı adı sistem tarafından ayrılmıştır." };
  }
  return { valid: true, value: trimmed };
}

export function validateEmail(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Geçerli bir e-posta adresi girin." };
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 100 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed)) {
    return { valid: false, value: "", error: "Geçerli bir e-posta adresi girin." };
  }
  return { valid: true, value: trimmed };
}

export function validatePassword(raw: unknown): { valid: boolean; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, error: "Şifre metin olmalıdır." };
  }
  if (raw.length < 8 || raw.length > 128) {
    return { valid: false, error: "Şifre en az 8 karakter uzunluğunda olmalıdır." };
  }
  if (!/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(raw) || !/[0-9]/.test(raw)) {
    return { valid: false, error: "Şifre en az bir harf ve bir rakam içermelidir." };
  }
  return { valid: true };
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPasswordHash(password: string, salt: string, storedHash: string): boolean {
  const computed = hashPassword(password, salt);
  const bufA = Buffer.from(computed, "hex");
  const bufB = Buffer.from(storedHash, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function normalizeName(name: string): string {
  return name.toLocaleLowerCase("tr");
}

function findByEmail(email: string): StoredUser | null {
  for (const u of usersById.values()) {
    if (u.email.toLowerCase() === email) return u;
  }
  return null;
}

function isUsernameTaken(username: string): boolean {
  const target = normalizeName(username);
  for (const u of usersById.values()) {
    if (normalizeName(u.username) === target) return true;
  }
  return false;
}

function toPublicUser(u: StoredUser) {
  return { id: u.id, username: u.username, email: u.email };
}

/* ------------------------------------------------------------------ */
/*  Token                                                              */
/* ------------------------------------------------------------------ */

export function signAuthToken(user: StoredUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 gün
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * Durumsuz (stateless) HMAC doğrulama: imza + süre geçerliyse kabul edilir.
 * Sunucu yeniden başlayıp kullanıcı listesi geç yüklense bile oturum düşmez.
 */
export function verifyAuthToken(token: unknown): AuthTokenPayload | null {
  if (typeof token !== "string" || token.length > 2048 || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AuthTokenPayload;
    if (
      !decoded ||
      typeof decoded.sub !== "string" ||
      typeof decoded.username !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.exp !== "number" ||
      !Number.isFinite(decoded.exp) ||
      Date.now() > decoded.exp
    ) {
      return null;
    }
    // Kullanıcı adı sonradan değiştiyse güncel adı döndür
    const live = usersById.get(decoded.sub);
    if (live) {
      return { ...decoded, username: live.username, email: live.email };
    }
    return decoded;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Kayıt / Giriş                                                      */
/* ------------------------------------------------------------------ */

export async function registerLocalUser(
  rawUsername: unknown,
  rawEmail: unknown,
  rawPassword: unknown
): Promise<AuthResult> {
  await initAuthStore();

  const uCheck = validateUsername(rawUsername);
  if (!uCheck.valid) return { ok: false, error: uCheck.error };

  const eCheck = validateEmail(rawEmail);
  if (!eCheck.valid) return { ok: false, error: eCheck.error };

  const pCheck = validatePassword(rawPassword);
  if (!pCheck.valid) return { ok: false, error: pCheck.error };

  const existing = findByEmail(eCheck.value);
  if (existing) {
    return {
      ok: false,
      error:
        existing.provider === "google"
          ? "Bu e-posta Google ile kayıtlı. Lütfen 'Google ile Devam Et' butonunu kullanın."
          : "Bu e-posta adresi zaten kayıtlı. 'Giriş Yap' sekmesinden giriş yapabilirsiniz.",
    };
  }
  if (isUsernameTaken(uCheck.value)) {
    return { ok: false, error: "Bu kullanıcı adı zaten alınmış." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const newUser: StoredUser = {
    id: `u_${crypto.randomBytes(8).toString("hex")}`,
    username: uCheck.value,
    email: eCheck.value,
    passwordHash: hashPassword(rawPassword as string, salt),
    salt,
    provider: "local",
    createdAt: Date.now(),
    totalScore: 0,
    totalKills: 0,
  };

  usersById.set(newUser.id, newUser);
  try {
    await persistUser(newUser);
  } catch (err) {
    usersById.delete(newUser.id);
    console.error("[AUTH] Kullanıcı kaydedilemedi:", err);
    return { ok: false, error: "Hesap şu an kaydedilemedi. Lütfen birkaç saniye sonra tekrar deneyin." };
  }

  return { ok: true, token: signAuthToken(newUser), user: toPublicUser(newUser) };
}

export async function loginLocalUser(rawIdentifier: unknown, rawPassword: unknown): Promise<AuthResult> {
  await initAuthStore();

  if (typeof rawIdentifier !== "string" || typeof rawPassword !== "string") {
    return { ok: false, error: "E-posta/kullanıcı adı ve şifre gereklidir." };
  }
  const cleanId = rawIdentifier.trim();
  if (!cleanId || !rawPassword || cleanId.length > 100 || rawPassword.length > 128) {
    return { ok: false, error: "E-posta/kullanıcı adı ve şifre gereklidir." };
  }

  const lowerEmail = cleanId.toLowerCase();
  const lowerName = normalizeName(cleanId);
  let foundUser: StoredUser | null = null;
  for (const u of usersById.values()) {
    if (u.email.toLowerCase() === lowerEmail || normalizeName(u.username) === lowerName) {
      foundUser = u;
      break;
    }
  }

  if (foundUser && foundUser.provider === "google" && !foundUser.passwordHash) {
    return {
      ok: false,
      error: "Bu hesap Google ile oluşturuldu. Lütfen 'Google ile Devam Et' butonunu kullanın.",
    };
  }

  if (!foundUser || !foundUser.salt || !foundUser.passwordHash) {
    // Zamanlama saldırısını zorlaştırmak için sahte hash hesapla
    hashPassword(rawPassword, "timing-equalizer-salt");
    return { ok: false, error: "Kullanıcı adı/e-posta veya şifre hatalı." };
  }

  if (!verifyPasswordHash(rawPassword, foundUser.salt, foundUser.passwordHash)) {
    return { ok: false, error: "Kullanıcı adı/e-posta veya şifre hatalı." };
  }

  return { ok: true, token: signAuthToken(foundUser), user: toPublicUser(foundUser) };
}

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export async function loginOrRegisterGoogleUser(idToken: unknown): Promise<AuthResult> {
  await initAuthStore();

  const allowedClientIds = (process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedClientIds.length === 0) {
    return {
      ok: false,
      error: "Sunucuda GOOGLE_CLIENT_ID henüz tanımlanmadı. Lütfen e-posta ile kayıt olun.",
    };
  }
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
    return { ok: false, error: "Geçersiz Google kimlik doğrulama kodu." };
  }

  let data: Record<string, unknown>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: controller.signal }
    ).finally(() => clearTimeout(timer));
    if (!resp.ok) {
      return { ok: false, error: "Google oturumu doğrulanamadı veya süresi doldu. Lütfen tekrar deneyin." };
    }
    data = (await resp.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Google doğrulama servisine ulaşılamadı. Lütfen tekrar deneyin." };
  }

  const aud = typeof data.aud === "string" ? data.aud : "";
  const iss = typeof data.iss === "string" ? data.iss : "";
  const sub = typeof data.sub === "string" ? data.sub : "";
  const expSec = Number(data.exp);
  const isVerified = data.email_verified === "true" || data.email_verified === true;

  if (!allowedClientIds.includes(aud)) {
    console.warn(`[AUTH] Google aud uyuşmazlığı. Gelen aud=${aud.slice(0, 20)}...`);
    return {
      ok: false,
      error: "Google uygulama kimliği sunucuyla eşleşmiyor (GOOGLE_CLIENT_ID kontrol edilmeli).",
    };
  }
  if (!GOOGLE_ISSUERS.has(iss) || !sub || !Number.isFinite(expSec) || expSec * 1000 < Date.now()) {
    return { ok: false, error: "Google oturumu geçersiz veya süresi dolmuş." };
  }
  if (!isVerified) {
    return { ok: false, error: "Google hesabınızın e-posta adresi doğrulanmamış." };
  }

  const emailCheck = validateEmail(data.email);
  if (!emailCheck.valid) {
    return { ok: false, error: "Google hesabından geçerli e-posta alınamadı." };
  }

  // Mevcut hesap (aynı e-posta) varsa ona giriş yap
  const existing = findByEmail(emailCheck.value);
  if (existing) {
    return { ok: true, token: signAuthToken(existing), user: toPublicUser(existing) };
  }

  // Yeni Google hesabı: Google "sub" değerinden deterministik ID ve kullanıcı adı üret.
  // Böylece depo sıfırlansa bile aynı kişi aynı ID/isimle geri döner.
  const subHash = crypto.createHash("sha256").update(`google:${sub}`).digest("hex");
  const userId = `g_${subHash.slice(0, 16)}`;

  const rawName =
    typeof data.given_name === "string" && data.given_name.trim()
      ? data.given_name
      : emailCheck.value.split("@")[0];
  const baseName =
    rawName
      .normalize("NFC")
      .replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, "")
      .slice(0, 10) || "Oyuncu";
  const finalBase = baseName.length >= 2 ? baseName : `Oyuncu`;
  let suffix = (parseInt(subHash.slice(0, 6), 16) % 9000) + 1000;
  let uniqueUsername = `${finalBase}_${suffix}`;
  for (let tries = 0; isUsernameTaken(uniqueUsername) && tries < 50; tries++) {
    suffix = suffix >= 9999 ? 1000 : suffix + 1;
    uniqueUsername = `${finalBase}_${suffix}`;
  }
  if (!validateUsername(uniqueUsername).valid) {
    uniqueUsername = `Oyuncu_${suffix}`;
  }

  const newUser: StoredUser = {
    id: userId,
    username: uniqueUsername,
    email: emailCheck.value,
    passwordHash: "",
    salt: "",
    provider: "google",
    createdAt: Date.now(),
    totalScore: 0,
    totalKills: 0,
  };

  usersById.set(newUser.id, newUser);
  try {
    await persistUser(newUser);
  } catch (err) {
    // Google kullanıcıları deterministik olduğu için kalıcı yazım başarısız olsa da giriş yapılabilir
    console.error("[AUTH] Google kullanıcısı kalıcı depoya yazılamadı:", err);
  }

  return { ok: true, token: signAuthToken(newUser), user: toPublicUser(newUser) };
}
