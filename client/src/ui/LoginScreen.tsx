import React, { useState, useEffect } from "react";
import { Gamepad2, Play, Sparkles, Shield, Swords, Users, PlusCircle } from "lucide-react";
import { JoinOptions } from "../network/client";

interface LoginScreenProps {
  onJoin: (options: JoinOptions) => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onJoin, isLoading, error }) => {
  const [name, setName] = useState(
    `Avcı_${Math.floor(100 + Math.random() * 900)}`
  );
  const [gameMode, setGameMode] = useState<"coop" | "pvp">("coop");
  const [roomCode, setRoomCode] = useState("");
  const [joinTab, setJoinTab] = useState<"public" | "friend">("public");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl) {
      setRoomCode(codeFromUrl);
      setJoinTab("friend");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent, createNew: boolean = false) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin({
      playerName: name.trim(),
      gameMode,
      roomCode: joinTab === "friend" ? roomCode.trim() : undefined,
      createNew,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.iconCircle}>
            <Gamepad2 size={32} color="#38bdf8" />
          </div>
          <div>
            <h1 style={styles.title}>SURVIVAL ARENA 2D</h1>
            <p style={styles.subtitle}>Düşman Dalgaları • Arkadaşlarla Co-op veya PvP</p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} style={styles.form}>
          {/* Player Name */}
          <div>
            <label style={styles.label}>Oyuncu Adınız</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              placeholder="Adınızı girin..."
              disabled={isLoading}
              style={styles.input}
              autoFocus
            />
          </div>

          {/* Game Mode Selection */}
          <div>
            <label style={styles.label}>Oyun Modu Seçin (Oyun içinde de değiştirilebilir)</label>
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
    width: "460px",
    maxWidth: "94vw",
    backgroundColor: "rgba(30, 41, 59, 0.78)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  iconCircle: {
    width: "54px",
    height: "54px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
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
};
