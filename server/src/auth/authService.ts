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

const RESERVED_NAMES = ["sistem", "system", "admin", "moderator", "sunucu", "server"];
const DATA_DIR = path.join(__dirname, "../../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET_FILE = path.join(DATA_DIR, "secret.key");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getOrCreateSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
    return process.env.AUTH_SECRET;
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, "utf8").trim();
  }
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, generated, { encoding: "utf8", mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getOrCreateSecret();

function loadUsers(): Map<string, StoredUser> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return new Map();
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const arr = JSON.parse(raw) as StoredUser[];
    const map = new Map<string, StoredUser>();
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (u && typeof u.id === "string") {
          map.set(u.id, u);
        }
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveUsers(users: Map<string, StoredUser>): void {
  const arr = Array.from(users.values());
  fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), { encoding: "utf8", mode: 0o600 });
}

const usersById = loadUsers();

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
      error: "Kullanıcı adı yalnızca harf, rakam ve alt çizgi (_) içerebilir.",
    };
  }
  const lower = trimmed.toLowerCase();
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

export function signAuthToken(user: StoredUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyAuthToken(token: unknown): AuthTokenPayload | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AuthTokenPayload;
    if (!decoded || typeof decoded.exp !== "number" || Date.now() > decoded.exp) {
      return null;
    }
    if (!usersById.has(decoded.sub)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function registerLocalUser(
  rawUsername: unknown,
  rawEmail: unknown,
  rawPassword: unknown
): { ok: boolean; error?: string; token?: string; user?: { id: string; username: string; email: string } } {
  const uCheck = validateUsername(rawUsername);
  if (!uCheck.valid) return { ok: false, error: uCheck.error };

  const eCheck = validateEmail(rawEmail);
  if (!eCheck.valid) return { ok: false, error: eCheck.error };

  const pCheck = validatePassword(rawPassword);
  if (!pCheck.valid) return { ok: false, error: pCheck.error };

  // Check uniqueness
  for (const existing of usersById.values()) {
    if (existing.email.toLowerCase() === eCheck.value) {
      return { ok: false, error: "Bu e-posta adresi zaten kayıtlı." };
    }
    if (existing.username.toLowerCase() === uCheck.value.toLowerCase()) {
      return { ok: false, error: "Bu kullanıcı adı zaten alınmış." };
    }
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(rawPassword as string, salt);
  const newUser: StoredUser = {
    id: `u_${crypto.randomBytes(8).toString("hex")}`,
    username: uCheck.value,
    email: eCheck.value,
    passwordHash,
    salt,
    provider: "local",
    createdAt: Date.now(),
    totalScore: 0,
    totalKills: 0,
  };

  usersById.set(newUser.id, newUser);
  saveUsers(usersById);

  const token = signAuthToken(newUser);
  return {
    ok: true,
    token,
    user: { id: newUser.id, username: newUser.username, email: newUser.email },
  };
}

export function loginLocalUser(
  rawIdentifier: unknown,
  rawPassword: unknown
): { ok: boolean; error?: string; token?: string; user?: { id: string; username: string; email: string } } {
  if (typeof rawIdentifier !== "string" || typeof rawPassword !== "string") {
    return { ok: false, error: "E-posta/kullanıcı adı ve şifre gereklidir." };
  }

  const cleanId = rawIdentifier.trim().toLowerCase();
  if (!cleanId || !rawPassword) {
    return { ok: false, error: "E-posta/kullanıcı adı ve şifre gereklidir." };
  }

  let foundUser: StoredUser | null = null;
  for (const u of usersById.values()) {
    if (u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser || !foundUser.salt || !foundUser.passwordHash) {
    return { ok: false, error: "Kullanıcı adı/e-posta veya şifre hatalı." };
  }

  const isMatch = verifyPasswordHash(rawPassword, foundUser.salt, foundUser.passwordHash);
  if (!isMatch) {
    return { ok: false, error: "Kullanıcı adı/e-posta veya şifre hatalı." };
  }

  const token = signAuthToken(foundUser);
  return {
    ok: true,
    token,
    user: { id: foundUser.id, username: foundUser.username, email: foundUser.email },
  };
}

export async function loginOrRegisterGoogleUser(
  idToken: unknown
): Promise<{ ok: boolean; error?: string; token?: string; user?: { id: string; username: string; email: string } }> {
  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (!expectedClientId) {
    return {
      ok: false,
      error: "Sunucuda GOOGLE_CLIENT_ID henüz tanımlanmadı. Lütfen e-posta ile kayıt olun.",
    };
  }
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
    return { ok: false, error: "Geçersiz Google kimlik doğrulama kodu." };
  }

  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!resp.ok) {
      return { ok: false, error: "Google oturumu doğrulanamadı." };
    }
    const data = (await resp.json()) as Record<string, unknown>;
    if (data.aud !== expectedClientId || data.email_verified !== "true") {
      return { ok: false, error: "Google token uygulama kimliği eşleşmedi." };
    }

    const emailCheck = validateEmail(data.email);
    if (!emailCheck.valid) {
      return { ok: false, error: "Google hesabından geçerli e-posta alınamadı." };
    }

    // Check if user already exists
    for (const u of usersById.values()) {
      if (u.email.toLowerCase() === emailCheck.value) {
        const token = signAuthToken(u);
        return {
          ok: true,
          token,
          user: { id: u.id, username: u.username, email: u.email },
        };
      }
    }

    // Create new user from Google profile
    const rawName = typeof data.given_name === "string" ? data.given_name : emailCheck.value.split("@")[0];
    const baseName = rawName.replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, "").slice(0, 11) || "Oyuncu";
    const uniqueUsername = `${baseName}_${crypto.randomInt(100, 999)}`;

    const newUser: StoredUser = {
      id: `u_${crypto.randomBytes(8).toString("hex")}`,
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
    saveUsers(usersById);

    const token = signAuthToken(newUser);
    return {
      ok: true,
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    };
  } catch {
    return { ok: false, error: "Google doğrulama servisine ulaşılamadı." };
  }
}
