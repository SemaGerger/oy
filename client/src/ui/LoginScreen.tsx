import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Play,
  Sparkles,
  Shield,
  Swords,
  Users,
  PlusCircle,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { JoinOptions } from "../network/client";
import { AuthUser } from "../network/authClient";

interface LoginScreenProps {
  user: AuthUser;
  token: string;
  onJoin: (options: JoinOptions) => void;
  isLoading: boolean;
  error?: string | null;
  onBackToPortal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  user,
  token,
  onJoin,
  isLoading,
  error,
  onBackToPortal,
}) => {
  const [gameMode, setGameMode] = useState<"coop" | "pvp">("coop");
  const [roomCode, setRoomCode] = useState("");
  const [joinTab, setJoinTab] = useState<"public" | "friend">("public");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl && /^[a-zA-Z0-9_-]{1,24}$/.test(codeFromUrl)) {
      setRoomCode(codeFromUrl);
      setJoinTab("friend");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent, createNew: boolean = false) => {
    e.preventDefault();
    onJoin({
      token,
      gameMode,
      roomCode: joinTab === "friend" ? roomCode.trim() : undefined,
      createNew,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {onBackToPortal && (
          <button type="button" onClick={onBackToPortal} style={styles.backPortalBtn}>
            <ArrowLeft size={15} /> Sitecont Game Ana Sayfasına Dön
          </button>
        )}

        <div style={styles.logoRow}>
          <div style={styles.iconCircle}>
            <Gamepad2 size={32} color="#38bdf8" />
          </div>
          <div>
            <h1 style={styles.title}>SURVIVAL ARENA 2D</h1>
            <p style={styles.subtitle}>1. Oyun • Engeller, Düşman Dalgaları & Co-op / PvP</p>
          </div>
        </div>

        {/* Verified Account Badge */}
        <div style={styles.verifiedRow}>
          <UserCheck size={16} color="#22c55e" />
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Giriş Yapılan Hesap:</span>
          <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "13px" }}>
            {user.username}
          </span>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} style={styles.form}>
          {/* Game Mode Selection */}
          <div>
            <label style={styles.label}>Oyun Modu Seçin (Oda sahibi oyun içinde değiştirebilir)</label>
            <div style={styles.modeGrid}>
              <div
                onClick={() => setGameMode("coop")}
                style={{
                  ...styles.modeCard,
                  borderColor: gameMode === "coop" ? "#22c55e" : "#334155",
                  backgroundColor:
                    gameMode === "coop" ? "rgba(34, 197, 94, 0.14)" : "rgba(15, 23, 42, 0.6)",
                }}
              >
                <div style={styles.modeHeader}>
                  <Shield size={18} color="#22c55e" />
                  <span style={{ fontWeight: "bold", color: "#ffffff", fontSize: "13px" }}>
                    1. Birlikte (Co-op)
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Arkadaşlarınla takım ol, üzerinize gelen düşmanları beraber öldürün! Dost ateşi kapalı.
                </p>
              </div>

              <div
                onClick={() => setGameMode("pvp")}
                style={{
                  ...styles.modeCard,
                  borderColor: gameMode === "pvp" ? "#ef4444" : "#334155",
                  backgroundColor:
                    gameMode === "pvp" ? "rgba(239, 68, 68, 0.15)" : "rgba(15, 23, 42, 0.6)",
                }}
              >
                <div style={styles.modeHeader}>
                  <Swords size={18} color="#ef4444" />
                  <span style={{ fontWeight: "bold", color: "#ffffff", fontSize: "13px" }}>
                    2. Kaos (PvP + Düşman)
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Hem düşmanları öldür hem de arkadaşlarınla birbirinizi vurun! Dost ateşi açık.
                </p>
              </div>
            </div>
          </div>

          {/* Join Tabs: Open Room vs Invite Code */}
          <div>
            <div style={styles.tabRow}>
              <button
                type="button"
                onClick={() => setJoinTab("public")}
                style={{
                  ...styles.tabBtn,
                  backgroundColor: joinTab === "public" ? "#1e293b" : "transparent",
                  color: joinTab === "public" ? "#38bdf8" : "#94a3b8",
                  borderColor: joinTab === "public" ? "#38bdf8" : "#334155",
                }}
              >
                🌐 Hızlı / Yeni Oda
              </button>
              <button
                type="button"
                onClick={() => setJoinTab("friend")}
                style={{
                  ...styles.tabBtn,
                  backgroundColor: joinTab === "friend" ? "#1e293b" : "transparent",
                  color: joinTab === "friend" ? "#38bdf8" : "#94a3b8",
                  borderColor: joinTab === "friend" ? "#38bdf8" : "#334155",
                }}
              >
                <Users size={14} /> Arkadaş Odasına Katıl
              </button>
            </div>

            {joinTab === "friend" && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Arkadaşının Oda Kodunu gir..."
                  disabled={isLoading}
                  style={styles.input}
                />
              </div>
            )}
          </div>

          {error && <div style={styles.errorText}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={isLoading} style={{ ...styles.button, flex: 1 }}>
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} /> Bağlanılıyor...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Play size={18} fill="#ffffff" />{" "}
                  {joinTab === "friend" ? "Odaya Katıl" : "Savaşa Başla"}
                </span>
              )}
            </button>

            {joinTab === "public" && (
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => handleSubmit(e, true)}
                style={styles.secondaryButton}
                title="Arkadaşlarını davet etmek için sıfırdan özel oda aç"
              >
                <PlusCircle size={17} /> Özel Oda Kur
              </button>
            )}
          </div>
        </form>

        {/* How to Play Box */}
        <div style={styles.howToPlay}>
          <div style={styles.howToTitle}>🎮 NASIL OYNANIR?</div>
          <div style={styles.howToGrid}>
            <div>🏃 <b>Hareket:</b> <span style={styles.keyTag}>W A S D</span> veya <span style={styles.keyTag}>Ok Tuşları</span></div>
            <div>🎯 <b>Nişan & Ateş:</b> <span style={styles.keyTag}>Mouse</span> ile nişan al, <span style={styles.keyTag}>Sol Tık</span> / <span style={styles.keyTag}>Boşluk</span> ile ateş et</div>
            <div>🪨 <b>Siper Al:</b> Etraftaki kayalar, metal duvarlar ve enerji sütunları mermileri durdurur!</div>
            <div>💚 <b>Can & Puan:</b> Sarı/yeşil küreleri toplayarak canını (+8 HP) doldur.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at center, #1e293b 0%, #090d16 100%)",
  },
  card: {
    width: "470px",
    maxWidth: "94vw",
    backgroundColor: "rgba(30, 41, 59, 0.82)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "20px",
    padding: "26px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  backPortalBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    color: "#38bdf8",
    borderRadius: "10px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  iconCircle: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "0.8px",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
  },
  verifiedRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "10px",
    padding: "9px 12px",
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
  input: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  modeCard: {
    border: "2px solid #334155",
    borderRadius: "12px",
    padding: "12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  modeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },
  modeDesc: {
    margin: 0,
    fontSize: "11px",
    color: "#94a3b8",
    lineHeight: 1.35,
  },
  tabRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  tabBtn: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #334155",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  button: {
    backgroundColor: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    borderRadius: "10px",
    padding: "13px 14px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  errorText: {
    color: "#f87171",
    fontSize: "12px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  howToPlay: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "12px",
    padding: "12px 14px",
  },
  howToTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#38bdf8",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  howToGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "12px",
    color: "#cbd5e1",
    lineHeight: 1.4,
  },
  keyTag: {
    backgroundColor: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "4px",
    padding: "1px 5px",
    fontSize: "11px",
    color: "#facc15",
    fontWeight: 600,
  },
};
