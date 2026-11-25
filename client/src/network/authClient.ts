export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

const envServerUrl = ((import.meta as any).env?.VITE_SERVER_URL as string | undefined)?.trim();

const API_BASE = envServerUrl
  ? envServerUrl.replace(/\/+$/, "")
  : window.location.protocol === "https:"
    ? `https://${window.location.hostname}:2567`
    : `http://${window.location.hostname}:2567`;

const TOKEN_STORAGE_KEY = "poki_arena_auth_token";

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage quota errors
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = (await res.json()) as AuthResponse;
    if (data.ok && data.token) {
      saveToken(data.token);
    }
    return data;
  } catch {
    return {
      ok: false,
      error: "Sunucuya bağlanılamadı. Lütfen sunucunun (port: 2567) çalıştığından emin olun.",
    };
  }
}

export async function loginUser(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = (await res.json()) as AuthResponse;
    if (data.ok && data.token) {
      saveToken(data.token);
    }
    return data;
  } catch {
    return {
      ok: false,
      error: "Sunucuya bağlanılamadı. Lütfen sunucunun (port: 2567) çalıştığından emin olun.",
    };
  }
}

export async function loginWithGoogleToken(idToken: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = (await res.json()) as AuthResponse;
    if (data.ok && data.token) {
      saveToken(data.token);
    }
    return data;
  } catch {
    return {
      ok: false,
      error: "Google oturumu doğrulanırken sunucuya ulaşılamadı.",
    };
  }
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser; token: string } | null> {
  const token = getSavedToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = (await res.json()) as AuthResponse;
    if (data.ok && data.user) {
      return { user: data.user, token };
    }
    clearToken();
    return null;
  } catch {
    return null;
  }
}
