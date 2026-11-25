import React, { useState, useEffect, useRef } from "react";
import { Gamepad2, Lock, Mail, User, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import {
  AuthUser,
  loginUser,
  registerUser,
  loginWithGoogleToken,
} from "../network/authClient";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleHint, setGoogleHint] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const scriptId = "google-gsi-script";
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) return;
            setIsLoading(true);
            setError(null);
            const res = await loginWithGoogleToken(response.credential);
            setIsLoading(false);
            if (res.ok && res.user && res.token) {
              onAuthenticated(res.user, res.token);
            } else {
              setError(res.error || "Google ile giriş yapılamadı.");
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          width: 360,
          text: "continue_with",
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    } else {
      initGoogle();
    }
  }, [googleClientId, onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGoogleHint(null);
    setIsLoading(true);

    try {
      if (mode === "register") {
        const res = await registerUser(username, email, password);
        if (res.ok && res.user && res.token) {
          onAuthenticated(res.user, res.token);
        } else {
          setError(res.error || "Kayıt işlemi başarısız oldu.");
        }
      } else {
        const res = await loginUser(identifier, password);
        if (res.ok && res.user && res.token) {
          onAuthenticated(res.user, res.token);
        } else {
          setError(res.error || "Giriş yapılamadı.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGooglePlaceholderClick = () => {
    setGoogleHint(
      "Google ile Giriş için Google Cloud Console'dan ücretsiz bir OAuth Client ID alıp .env dosyasına (GOOGLE_CLIENT_ID ve VITE_GOOGLE_CLIENT_ID) eklemeniz gerekir. Şimdilik yukarıdan e-posta ve şifre ile anında güvenli kayıt olabilirsiniz!"
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandIcon}>
            <Gamepad2 size={30} color="#ffffff" />
          </div>
          <div>
            <h1 style={styles.title}>
              POKI <span style={{ color: "#38bdf8" }}>ARENA</span>
            </h1>
            <p style={styles.subtitle}>Oynamak için güvenli hesabınızla giriş yapın</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            style={{
              ...styles.tabBtn,
              backgroundColor: mode === "register" ? "#0284c7" : "transparent",
              color: mode === "register" ? "#ffffff" : "#94a3b8",
            }}
          >
            <UserPlus size={15} /> Kayıt Ol
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            style={{
              ...styles.tabBtn,
              backgroundColor: mode === "login" ? "#0284c7" : "transparent",
              color: mode === "login" ? "#ffffff" : "#94a3b8",
            }}
          >
            <LogIn size={15} /> Giriş Yap
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "register" ? (
            <>
              <div>
                <label style={styles.label}>Kullanıcı Adı (Oyunda görünecek isim)</label>
                <div style={styles.inputWrap}>
                  <User size={16} color="#64748b" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Örn: EfsaneAvci"
                    maxLength={15}
                    required
                    disabled={isLoading}
                    style={styles.input}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>E-posta Adresi</label>
                <div style={styles.inputWrap}>
                  <Mail size={16} color="#64748b" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    maxLength={100}
                    required
                    disabled={isLoading}
                    style={styles.input}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={styles.label}>E-posta veya Kullanıcı Adı</label>
              <div style={styles.inputWrap}>
                <User size={16} color="#64748b" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Kullanıcı adınız veya e-postanız"
                  maxLength={100}
                  required
                  disabled={isLoading}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div>
            <label style={styles.label}>
              Şifre {mode === "register" && <span style={styles.hint}>(En az 8 karakter, harf + rakam)</span>}
            </label>
            <div style={styles.inputWrap}>
              <Lock size={16} color="#64748b" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
                required
                disabled={isLoading}
                style={styles.input}
              />
            </div>
          </div>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          <button type="submit" disabled={isLoading} style={styles.submitBtn}>
            {isLoading
              ? "İşleniyor..."
              : mode === "register"
                ? "Güvenli Hesap Oluştur & Devam Et"
                : "Giriş Yap"}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>veya</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google Sign-In Section */}
        {googleClientId ? (
          <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
        ) : (
          <button
            type="button"
            onClick={handleGooglePlaceholderClick}
            style={styles.googleBtn}
          >
            <span style={styles.googleG}>G</span>
            <span>Google ile Giriş Yap</span>
          </button>
        )}

        {googleHint && <div style={styles.infoBox}>ℹ️ {googleHint}</div>}

        <div style={styles.securityFooter}>
          <ShieldCheck size={14} color="#22c55e" />
          <span>scrypt Şifreleme • HMAC-SHA256 Token • Brute-Force Korumalı</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top, #1e293b 0%, #090d16 100%)",
    padding: "16px",
  },
  card: {
    width: "430px",
    maxWidth: "95vw",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    color: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  brandIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(56, 189, 248, 0.35)",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 900,
    letterSpacing: "1px",
  },
  subtitle: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#0f172a",
    borderRadius: "12px",
    padding: "4px",
    border: "1px solid #1e293b",
  },
  tabBtn: {
    border: "none",
    borderRadius: "9px",
    padding: "9px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.15s ease",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: "6px",
    display: "block",
  },
  hint: {
    color: "#64748b",
    fontWeight: 400,
    fontSize: "11px",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#090d16",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "0 12px",
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#ffffff",
    fontSize: "14px",
    padding: "11px 0",
  },
  submitBtn: {
    marginTop: "4px",
    backgroundColor: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "11px",
    padding: "13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(2, 132, 199, 0.4)",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fca5a5",
    fontSize: "12px",
    padding: "9px 12px",
    borderRadius: "9px",
  },
  infoBox: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#bae6fd",
    fontSize: "11px",
    lineHeight: 1.45,
    padding: "9px 12px",
    borderRadius: "9px",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#1e293b",
  },
  dividerText: {
    fontSize: "11px",
    color: "#64748b",
  },
  googleBtn: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: "none",
    borderRadius: "11px",
    padding: "11px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  googleG: {
    fontWeight: 900,
    fontSize: "16px",
    color: "#ea4335",
  },
  securityFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#64748b",
    paddingTop: "6px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  },
};
