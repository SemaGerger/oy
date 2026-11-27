import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Play,
  Shield,
  Swords,
  Users,
  PlusCircle,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { JoinOptions } from "../network/client";
import { AuthUser } from "../network/authClient";
import {
  HERO_SKINS,
  getSavedHeroId,
  saveHeroId,
  getPlayerProgress,
  isHeroUnlocked,
} from "../game/heroes";
import { AdSlot } from "../ads/AdSlot";

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
  const [difficulty, setDifficulty] = useState<"medium" | "hard">("medium");
  const [selectedSkin, setSelectedSkin] = useState<string>(() => getSavedHeroId());
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinTab, setJoinTab] = useState<"public" | "friend">("public");
  const progress = getPlayerProgress();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl && /^[a-zA-Z0-9_-]{1,24}$/.test(codeFromUrl)) {
      setRoomCode(codeFromUrl);
      setJoinTab("friend");
    }
  }, []);

  const handleSelectSkin = (id: string, unlockLevel: number, heroName: string) => {
    if (!isHeroUnlocked(id, progress.level)) {
      setLockNotice(`🔒 ${heroName} Seviye ${unlockLevel}'de açılır! (Şu an: Lv.${progress.level})`);
      return;
    }
    setLockNotice(null);
    setSelectedSkin(id);
    saveHeroId(id);
  };

  const handleSubmit = (e: React.FormEvent, createNew: boolean = false) => {
    e.preventDefault();
    onJoin({
      token,
      gameMode,
      difficulty,
      skin: selectedSkin,
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
            <Gamepad2 size={28} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={styles.title}>Survival Arena 2D</h1>
            <p style={styles.subtitle}>Karakterini ve oda ayarlarını seç</p>
          </div>
        </div>

        {/* Verified Account Badge */}
        <div style={styles.verifiedRow}>
          <UserCheck size={16} color="#16a34a" />
          <span style={{ color: "#52525b", fontSize: "12px", fontWeight: 600 }}>Hesap:</span>
          <span style={{ color: "#18181b", fontWeight: 800, fontSize: "13px" }}>
            {user.username}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              fontWeight: 800,
              color: "#b45309",
              backgroundColor: "#fef3c7",
              padding: "2px 8px",
              borderRadius: "999px",
            }}
          >
            ⭐ Lv.{progress.level}
          </span>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} style={styles.form}>
          {/* Hero Character Selector */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label style={{ ...styles.label, marginBottom: 0 }}>
                Karakterini Seç (Level atladıkça açılır)
              </label>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#71717a" }}>
                {progress.currentLevelXp}/{progress.nextLevelXp} XP
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "6px",
              }}
            >
              {HERO_SKINS.map((hero) => {
                const unlocked = isHeroUnlocked(hero.id, progress.level);
                const active = unlocked && selectedSkin === hero.id;
                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => handleSelectSkin(hero.id, hero.unlockLevel, hero.name)}
                    title={
                      unlocked
                        ? hero.name
                        : `${hero.name} — Seviye ${hero.unlockLevel}'de açılır`
                    }
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "3px",
                      padding: "5px 3px",
                      borderRadius: "10px",
                      cursor: unlocked ? "pointer" : "not-allowed",
                      border: active ? `2px solid ${hero.accent}` : "1.5px solid #e4e4e7",
                      backgroundColor: active ? "#f4f4f5" : unlocked ? "#ffffff" : "#f4f4f5",
                      fontFamily: "inherit",
                      opacity: unlocked ? 1 : 0.7,
                    }}
                  >
                    <img
                      src={hero.spritePath}
                      alt={hero.name}
                      style={{
                        width: "38px",
                        height: "38px",
                        objectFit: "contain",
                        filter: unlocked ? "none" : "grayscale(90%) brightness(0.8)",
                      }}
                    />
                    {!unlocked && (
                      <span
                        style={{
                          position: "absolute",
                          top: "3px",
                          right: "3px",
                          fontSize: "8px",
                          fontWeight: 800,
                          backgroundColor: "#18181b",
                          color: "#fbbf24",
                          borderRadius: "5px",
                          padding: "1px 4px",
                        }}
                      >
                        🔒{hero.unlockLevel}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: active ? 800 : 600,
                        color: unlocked ? "#18181b" : "#71717a",
                        textAlign: "center",
                        lineHeight: 1.1,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {unlocked ? hero.name.split(" ")[0] : `Lv.${hero.unlockLevel}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {lockNotice && (
              <div style={{ fontSize: "11px", color: "#b45309", fontWeight: 700, marginTop: "6px" }}>
                {lockNotice}
              </div>
            )}
          </div>
          {/* Game Mode Selection */}
          <div>
            <label style={styles.label}>Oyun Modu (Oda sahibi oyun içinde değiştirebilir)</label>
            <div style={styles.modeGrid}>
              <div
                onClick={() => setGameMode("coop")}
                style={{
                  ...styles.modeCard,
                  borderColor: gameMode === "coop" ? "#16a34a" : "#e4e4e7",
                  backgroundColor: gameMode === "coop" ? "#f0fdf4" : "#fafafa",
                }}
              >
                <div style={styles.modeHeader}>
                  <Shield size={17} color="#16a34a" />
                  <span style={{ fontWeight: 800, color: "#18181b", fontSize: "13px" }}>
                    Birlikte (Co-op)
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Takım ol, düşmanları beraber temizle. Dost ateşi kapalı.
                </p>
              </div>

              <div
                onClick={() => setGameMode("pvp")}
                style={{
                  ...styles.modeCard,
                  borderColor: gameMode === "pvp" ? "#dc2626" : "#e4e4e7",
                  backgroundColor: gameMode === "pvp" ? "#fef2f2" : "#fafafa",
                }}
              >
                <div style={styles.modeHeader}>
                  <Swords size={17} color="#dc2626" />
                  <span style={{ fontWeight: 800, color: "#18181b", fontSize: "13px" }}>
                    Kaos (PvP + Düşman)
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Hem düşmanlarla hem arkadaşlarınla savaş. Dost ateşi açık.
                </p>
              </div>
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label style={styles.label}>Zorluk Seviyesi (Dalgalar gittikçe zorlaşır)</label>
            <div style={styles.modeGrid}>
              <div
                onClick={() => setDifficulty("medium")}
                style={{
                  ...styles.modeCard,
                  borderColor: difficulty === "medium" ? "#d97706" : "#e4e4e7",
                  backgroundColor: difficulty === "medium" ? "#fffbeb" : "#fafafa",
                }}
              >
                <div style={styles.modeHeader}>
                  <span style={{ fontSize: "15px" }}>🔥</span>
                  <span style={{ fontWeight: 800, color: "#18181b", fontSize: "13px" }}>
                    Orta
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Dengeli artış. Her 3. dalgada Dev Boss gelir.
                </p>
              </div>

              <div
                onClick={() => setDifficulty("hard")}
                style={{
                  ...styles.modeCard,
                  borderColor: difficulty === "hard" ? "#be123c" : "#e4e4e7",
                  backgroundColor: difficulty === "hard" ? "#fff1f2" : "#fafafa",
                }}
              >
                <div style={styles.modeHeader}>
                  <span style={{ fontSize: "15px" }}>👑</span>
                  <span style={{ fontWeight: 800, color: "#18181b", fontSize: "13px" }}>
                    Zor (1.5x Skor)
                  </span>
                </div>
                <p style={styles.modeDesc}>
                  Hızlı ve sert dalgalar. Her 2. dalgada Dev Boss + minyonlar!
                </p>
              </div>
            </div>
          </div>

          {/* Join Tabs */}
          <div>
            <div style={styles.tabRow}>
              <button
                type="button"
                onClick={() => setJoinTab("public")}
                style={{
                  ...styles.tabBtn,
                  backgroundColor: joinTab === "public" ? "#18181b" : "#f4f4f5",
                  color: joinTab === "public" ? "#ffffff" : "#52525b",
                }}
              >
                Hızlı / Yeni Oda
              </button>
              <button
                type="button"
                onClick={() => setJoinTab("friend")}
                style={{
                  ...styles.tabBtn,
                  backgroundColor: joinTab === "friend" ? "#18181b" : "#f4f4f5",
                  color: joinTab === "friend" ? "#ffffff" : "#52525b",
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

          {error && <div style={styles.errorText}>{error}</div>}

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={isLoading} style={{ ...styles.button, flex: 1 }}>
              {isLoading ? (
                <span>Bağlanılıyor...</span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Play size={16} fill="#ffffff" />{" "}
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
                title="Arkadaşlarını davet etmek için özel oda aç"
              >
                <PlusCircle size={16} /> Özel Oda
              </button>
            )}
          </div>
        </form>

        {/* Clean Controls Box */}
        <div style={styles.howToPlay}>
          <div style={styles.howToTitle}>KONTROLLER</div>
          <div style={styles.howToGrid}>
            <div>
              <b>Hareket:</b> <span style={styles.keyTag}>Mouse ile Sürükle</span> veya{" "}
              <span style={styles.keyTag}>W A S D</span>
            </div>
            <div>
              <b>Ateş Etme:</b> Otomatik! Karakter en yakın düşmana döner ve ateş eder.
            </div>
            <div>
              <b>Siper & Can:</b> Engeller mermileri durdurur, yerdeki küreler +8 HP verir.
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Lobby Companion Ad: 300x250 beside card on Desktop | 320x50 below card on Mobile */}
      <AdSlot slotKey="lobby_companion" style={{ margin: 0 }} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    alignContent: "center",
    gap: "20px",
    overflowY: "auto",
    backgroundColor: "#f4f6f9",
    backgroundImage: "radial-gradient(#d8dee9 1.2px, transparent 1.2px)",
    backgroundSize: "24px 24px",
    padding: "16px",
  },
  card: {
    width: "460px",
    maxWidth: "95vw",
    backgroundColor: "#ffffff",
    border: "1px solid #e4e4e7",
    borderRadius: "20px",
    padding: "26px",
    boxShadow: "0 12px 32px rgba(24, 24, 27, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    color: "#18181b",
  },
  backPortalBtn: {
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
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  iconCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    backgroundColor: "#24302a",
    borderBottom: "3px solid #171f1b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#18181b",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#71717a",
  },
  verifiedRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
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
    fontWeight: 700,
    color: "#3f3f46",
    marginBottom: "6px",
    display: "block",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#fafafa",
    border: "1.5px solid #e4e4e7",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#18181b",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  modeCard: {
    border: "2px solid #e4e4e7",
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
    color: "#52525b",
    lineHeight: 1.4,
  },
  tabRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  tabBtn: {
    padding: "9px 10px",
    borderRadius: "9px",
    border: "none",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "inherit",
  },
  button: {
    backgroundColor: "#f05232",
    color: "#ffffff",
    border: "none",
    borderBottom: "3px solid #c93b1e",
    borderRadius: "11px",
    padding: "13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#18181b",
    border: "1.5px solid #e4e4e7",
    borderBottom: "3px solid #d4d4d8",
    borderRadius: "11px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: 600,
    backgroundColor: "#fef2f2",
    padding: "9px 12px",
    borderRadius: "9px",
    border: "1px solid #fecaca",
  },
  howToPlay: {
    backgroundColor: "#fafafa",
    border: "1px solid #e4e4e7",
    borderRadius: "12px",
    padding: "12px 14px",
  },
  howToTitle: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#71717a",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  howToGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    fontSize: "12px",
    color: "#3f3f46",
    lineHeight: 1.45,
  },
  keyTag: {
    backgroundColor: "#ffffff",
    border: "1px solid #d4d4d8",
    borderBottom: "2px solid #a1a1aa",
    borderRadius: "5px",
    padding: "1px 6px",
    fontSize: "11px",
    color: "#18181b",
    fontWeight: 700,
  },
};
