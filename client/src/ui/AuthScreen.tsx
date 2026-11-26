import React, { useState, useEffect, useRef } from "react";
import { Gamepad2, Lock, Mail, User, LogIn, UserPlus, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  AuthUser,
  loginUser,
  registerUser,
  loginWithGoogleToken,
} from "../network/authClient";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
  onBackToPortal?: () => void;
  reasonText?: string;
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

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onBackToPortal,
  reasonText,
}) => {
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
          theme: "outline",
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
      "Google ile Giriş için Google Cloud Console'dan OAuth Client ID tanımlanmalıdır. Şimdilik yukarıdan e-posta ve şifre ile kayıt olabilirsiniz."
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {onBackToPortal && (
          <button type="button" onClick={onBackToPortal} style={styles.backBtn}>
            <ArrowLeft size={15} /> Oyunlara Dön
          </button>
        )}

        <div style={styles.header}>
          <div style={styles.brandIcon}>
            <Gamepad2 size={26} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={styles.titleRow}>
              <span style={styles.title}>SITECONT</span>
              <span style={styles.titleBadge}>GAME</span>
            </div>
            <p style={styles.subtitle}>
              {reasonText || "Çok oyunculu oyunlara katılmak için hesabınla devam et"}
            </p>
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
              backgroundColor: mode === "register" ? "#ffffff" : "transparent",
              color: mode === "register" ? "#18181b" : "#71717a",
              boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
              backgroundColor: mode === "login" ? "#ffffff" : "transparent",
              color: mode === "login" ? "#18181b" : "#71717a",
              boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <LogIn size={15} /> Giriş Yap
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "register" ? (
            <>
              <div>
                <label style={styles.label}>Kullanıcı Adı</label>
                <div style={styles.inputWrap}>
                  <User size={16} color="#a1a1aa" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Örn: MertOyuncu"
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
                  <Mail size={16} color="#a1a1aa" />
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
                <User size={16} color="#a1a1aa" />
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
              Şifre{" "}
              {mode === "register" && (
                <span style={styles.hint}>(en az 8 karakter, harf ve rakam)</span>
              )}
            </label>
            <div style={styles.inputWrap}>
              <Lock size={16} color="#a1a1aa" />
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

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={isLoading} style={styles.submitBtn}>
            {isLoading
              ? "Lütfen bekleyin..."
              : mode === "register"
                ? "Hesap Oluştur ve Başla"
                : "Giriş Yap"}
          </button>
        </form>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>veya</span>
          <div style={styles.dividerLine} />
        </div>

        {googleClientId ? (
          <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
        ) : (
          <button type="button" onClick={handleGooglePlaceholderClick} style={styles.googleBtn}>
            <span style={styles.googleG}>G</span>
            <span>Google ile Devam Et</span>
          </button>
        )}

        {googleHint && <div style={styles.infoBox}>{googleHint}</div>}

        <div style={styles.securityFooter}>
          <ShieldCheck size={14} color="#16a34a" />
          <span>Şifreli hesap koruması ve güvenli oturum</span>
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
    backgroundColor: "#f4f6f9",
    backgroundImage: "radial-gradient(#d8dee9 1.2px, transparent 1.2px)",
    backgroundSize: "24px 24px",
    padding: "16px",
  },
  card: {
    width: "420px",
    maxWidth: "95vw",
    backgroundColor: "#ffffff",
    border: "1px solid #e4e4e7",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 12px 32px rgba(24, 24, 27, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    color: "#18181b",
  },
  backBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#f4f4f5",
    border: "1px solid #e4e4e7",
    color: "#3f3f46",
    borderRadius: "9px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  brandIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    backgroundColor: "#f05232",
    borderBottom: "3px solid #c93b1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  title: {
    fontSize: "21px",
    fontWeight: 800,
    letterSpacing: "-0.3px",
    color: "#18181b",
  },
  titleBadge: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "#18181b",
    padding: "2px 7px",
    borderRadius: "6px",
    letterSpacing: "0.4px",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "13px",
    color: "#71717a",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#f1f3f5",
    borderRadius: "12px",
    padding: "4px",
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
    fontWeight: 700,
    color: "#3f3f46",
    marginBottom: "6px",
    display: "block",
  },
  hint: {
    color: "#a1a1aa",
    fontWeight: 500,
    fontSize: "11px",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#fafafa",
    border: "1.5px solid #e4e4e7",
    borderRadius: "10px",
    padding: "0 12px",
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#18181b",
    fontSize: "14px",
    padding: "11px 0",
    fontFamily: "inherit",
  },
  submitBtn: {
    marginTop: "4px",
    backgroundColor: "#f05232",
    color: "#ffffff",
    border: "none",
    borderBottom: "3px solid #c93b1e",
    borderRadius: "11px",
    padding: "13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: 600,
    padding: "10px 12px",
    borderRadius: "9px",
  },
  infoBox: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    color: "#0369a1",
    fontSize: "12px",
    lineHeight: 1.45,
    padding: "10px 12px",
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
    backgroundColor: "#e4e4e7",
  },
  dividerText: {
    fontSize: "12px",
    color: "#a1a1aa",
    fontWeight: 600,
  },
  googleBtn: {
    backgroundColor: "#ffffff",
    color: "#27272a",
    border: "1.5px solid #e4e4e7",
    borderBottom: "3px solid #d4d4d8",
    borderRadius: "11px",
    padding: "11px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontFamily: "inherit",
  },
  googleG: {
    fontWeight: 800,
    fontSize: "16px",
    color: "#ea4335",
  },
  securityFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#71717a",
    paddingTop: "8px",
    borderTop: "1px solid #f4f4f5",
  },
};
