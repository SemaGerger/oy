import React, { useState } from "react";
import {
  Gamepad2,
  Play,
  Swords,
  Users,
  LogOut,
  UserCheck,
  Shield,
  Link2,
  LogIn,
  Briefcase,
  Moon,
  Sun,
  LayoutGrid,
} from "lucide-react";
import { GAMES_REGISTRY } from "./gamesRegistry";
import { AuthUser } from "../network/authClient";
import { useTheme } from "../theme/ThemeContext";
import {
  HERO_SKINS,
  getSavedHeroId,
  saveHeroId,
  getPlayerProgress,
  isHeroUnlocked,
} from "../game/heroes";

interface PortalHomeProps {
  user: AuthUser | null;
  onSelectGame: (
    gameId: string,
    playMode: "solo" | "multiplayer",
    difficulty?: "medium" | "hard",
    heroId?: string
  ) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const PortalHome: React.FC<PortalHomeProps> = ({
  user,
  onSelectGame,
  onOpenAuth,
  onLogout,
}) => {
  const { isOffice, setTheme } = useTheme();
  const [soloDifficulty, setSoloDifficulty] = useState<"medium" | "hard">("medium");
  const [selectedHeroId, setSelectedHeroId] = useState<string>(() => getSavedHeroId());
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const progress = getPlayerProgress();
  const firstGame = GAMES_REGISTRY[0];

  const handlePickHero = (id: string, unlockLevel: number, heroName: string) => {
    if (!isHeroUnlocked(id, progress.level)) {
      setLockNotice(`🔒 ${heroName} için Seviye ${unlockLevel} olmalısın! (Şu an: Lv.${progress.level})`);
      return;
    }
    setLockNotice(null);
    setSelectedHeroId(id);
    saveHeroId(id);
  };

  return (
    <div
      style={{
        ...styles.page,
        backgroundColor: isOffice ? "#f8fafc" : "#16171a",
        backgroundImage: isOffice
          ? "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)"
          : "radial-gradient(#27272a 1.2px, transparent 1.2px)",
        backgroundSize: isOffice ? "32px 32px" : "24px 24px",
        color: isOffice ? "#0f172a" : "#fafaf9",
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          ...styles.navbar,
          backgroundColor: isOffice ? "#ffffff" : "#1e1f24",
          borderBottom: isOffice ? "1px solid #e2e8f0" : "1px solid #2e3038",
        }}
      >
        <div style={styles.brand}>
          <div
            style={{
              ...styles.brandIcon,
              backgroundColor: isOffice ? "#2563eb" : "#f05232",
              borderBottom: isOffice ? "2px solid #1d4ed8" : "3px solid #c93b1e",
            }}
          >
            {isOffice ? (
              <LayoutGrid size={21} color="#ffffff" strokeWidth={2.2} />
            ) : (
              <Gamepad2 size={24} color="#ffffff" strokeWidth={2.4} />
            )}
          </div>
          <div style={styles.brandTextRow}>
            <span
              style={{
                ...styles.brandTitle,
                color: isOffice ? "#0f172a" : "#ffffff",
              }}
            >
              {isOffice ? "Sitecont" : "SITECONT"}
            </span>
            <span
              style={{
                ...styles.brandAccent,
                backgroundColor: isOffice ? "#eff6ff" : "#f05232",
                color: isOffice ? "#1d4ed8" : "#ffffff",
                border: isOffice ? "1px solid #bfdbfe" : "none",
              }}
            >
              {isOffice ? "Workspace" : "GAME"}
            </span>
          </div>
        </div>

        {/* Center/Right: Office (Light) vs Fun (Dark) Switcher + User */}
        <div style={styles.rightControls}>
          <div
            style={{
              ...styles.themeSwitch,
              backgroundColor: isOffice ? "#f1f5f9" : "#131417",
              border: isOffice ? "1px solid #cbd5e1" : "1px solid #2e3038",
            }}
            title="Kısayol: Shift + O ile anında Ofis / Eğlence modu değiştir"
          >
            <button
              type="button"
              onClick={() => setTheme("fun")}
              style={{
                ...styles.themeBtn,
                backgroundColor: !isOffice ? "#f05232" : "transparent",
                color: !isOffice ? "#ffffff" : "#64748b",
              }}
            >
              <Moon size={13} /> Eğlence
            </button>
            <button
              type="button"
              onClick={() => setTheme("office")}
              style={{
                ...styles.themeBtn,
                backgroundColor: isOffice ? "#ffffff" : "transparent",
                color: isOffice ? "#0f172a" : "#9ca3af",
                boxShadow: isOffice ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Sun size={13} /> Açık Mod
            </button>
          </div>

          <div style={styles.userSection}>
            {user ? (
              <>
                <div
                  style={{
                    ...styles.userBadge,
                    backgroundColor: isOffice ? "#f8fafc" : "#27282e",
                    border: isOffice ? "1px solid #e2e8f0" : "1px solid #3f3f46",
                  }}
                >
                  <UserCheck size={15} color="#16a34a" />
                  <span style={{ fontWeight: 700, color: isOffice ? "#0f172a" : "#fafaf9" }}>
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    ...styles.logoutBtn,
                    backgroundColor: isOffice ? "#ffffff" : "#27282e",
                    border: isOffice ? "1px solid #e2e8f0" : "1px solid #3f3f46",
                    color: isOffice ? "#475569" : "#d4d4d8",
                  }}
                  title="Hesaptan çıkış yap"
                >
                  <LogOut size={14} /> Çıkış
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                style={{
                  ...styles.loginNavBtn,
                  backgroundColor: isOffice ? "#2563eb" : "#f05232",
                  borderBottom: isOffice ? "2px solid #1d4ed8" : "3px solid #c93b1e",
                }}
              >
                <LogIn size={15} /> Giriş Yap / Kayıt Ol
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Stealth Light Mode Tip Banner */}
        {isOffice && (
          <div style={styles.officeTipBar}>
            <Briefcase size={15} color="#2563eb" />
            <span>
              <b>Açık Mod Aktif:</b> Ekranınız sade çalışma alanı görünümündedir.
              Oyun içinde de <b>Shift + O</b> tuşuyla anında Açık / Eğlence modu arasında geçiş yapabilirsiniz.
            </span>
          </div>
        )}

        {/* Featured Hero Section */}
        <section
          style={{
            ...styles.heroCard,
            backgroundColor: isOffice ? "#ffffff" : "#24302a",
            border: isOffice ? "1px solid #cbd5e1" : "2px solid #1b2420",
            borderBottom: isOffice ? "2px solid #cbd5e1" : "5px solid #151c18",
            color: isOffice ? "#0f172a" : "#ffffff",
            boxShadow: isOffice
              ? "0 4px 14px rgba(15, 23, 42, 0.05)"
              : "0 16px 34px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={styles.heroLeft}>
            <div
              style={{
                ...styles.heroBadge,
                backgroundColor: isOffice ? "#eff6ff" : "#fbbf24",
                color: isOffice ? "#1d4ed8" : "#18181b",
                border: isOffice ? "1px solid #bfdbfe" : "none",
              }}
            >
              {isOffice ? "AKTİF MODÜL • ÇOK KULLANICILI" : "1. OYUN • ÇOK OYUNCULU"}
            </div>
            <h1
              style={{
                ...styles.heroTitle,
                color: isOffice ? "#0f172a" : "#ffffff",
              }}
            >
              {isOffice ? "Kaynak & Akış Simülasyonu (Arena 2D)" : firstGame.title}
            </h1>
            <p
              style={{
                ...styles.heroDesc,
                color: isOffice ? "#475569" : "#d6d3d1",
              }}
            >
              {isOffice
                ? "Ekip arkadaşlarınızla ortak odada gerçek zamanlı 2D koordinasyon ve strateji simülasyonunu başlatın. Ekranınız sade teknik diyagram görünümünde açılır."
                : "Kayaların ve siper duvarlarının arkasına saklanarak üzerine gelen düşman dalgalarını durdur. Arkadaşlarınla birlikte oyna ya da PvP modunu açıp birbirinizle yarışın."}
            </p>
            <div style={styles.heroMetaRow}>
              <span
                style={{
                  ...styles.metaChip,
                  backgroundColor: isOffice ? "#f8fafc" : "rgba(255, 255, 255, 0.08)",
                  border: isOffice ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: isOffice ? "#334155" : "#f5f5f4",
                }}
              >
                <Users size={14} color={isOffice ? "#2563eb" : "#fbbf24"} /> {firstGame.playersText}
              </span>
              <span
                style={{
                  ...styles.metaChip,
                  backgroundColor: isOffice ? "#f8fafc" : "rgba(255, 255, 255, 0.08)",
                  border: isOffice ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: isOffice ? "#334155" : "#f5f5f4",
                }}
              >
                <Shield size={14} color={isOffice ? "#16a34a" : "#4ade80"} /> Co-op ve PvP
              </span>
              <span
                style={{
                  ...styles.metaChip,
                  backgroundColor: isOffice ? "#f8fafc" : "rgba(255, 255, 255, 0.08)",
                  border: isOffice ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: isOffice ? "#334155" : "#f5f5f4",
                }}
              >
                <Link2 size={14} color={isOffice ? "#64748b" : "#f59e0b"} /> Oda Koduyla Davet
              </span>
            </div>
            {/* Character / Hero Skin Picker + Level Progression */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "4px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isOffice ? "#475569" : "#d6d3d1",
                  }}
                >
                  {isOffice ? "Profil Simgesi:" : "Karakterler (Level atladıkça açılır):"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: isOffice ? "#eff6ff" : "rgba(251, 191, 36, 0.18)",
                      color: isOffice ? "#1d4ed8" : "#fbbf24",
                    }}
                  >
                    ⭐ Seviye {progress.level}
                  </span>
                  <div
                    style={{
                      width: "76px",
                      height: "7px",
                      borderRadius: "999px",
                      backgroundColor: isOffice ? "#e2e8f0" : "rgba(255,255,255,0.12)",
                      overflow: "hidden",
                    }}
                    title={`${progress.currentLevelXp} / ${progress.nextLevelXp} XP`}
                  >
                    <div
                      style={{
                        width: `${Math.round(progress.progressRatio * 100)}%`,
                        height: "100%",
                        backgroundColor: isOffice ? "#2563eb" : "#fbbf24",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: isOffice ? "#64748b" : "#a8a29e" }}>
                    {progress.currentLevelXp}/{progress.nextLevelXp} XP
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {HERO_SKINS.map((hero) => {
                  const unlocked = isHeroUnlocked(hero.id, progress.level);
                  const active = unlocked && selectedHeroId === hero.id;
                  return (
                    <button
                      key={hero.id}
                      type="button"
                      onClick={() => handlePickHero(hero.id, hero.unlockLevel, hero.name)}
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
                        padding: "5px 7px",
                        borderRadius: "12px",
                        cursor: unlocked ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        minWidth: "62px",
                        opacity: unlocked ? 1 : 0.65,
                        border: active
                          ? `2px solid ${hero.accent}`
                          : isOffice
                            ? "1px solid #cbd5e1"
                            : "1px solid rgba(255,255,255,0.14)",
                        backgroundColor: active
                          ? isOffice
                            ? "#eff6ff"
                            : "rgba(255,255,255,0.14)"
                          : isOffice
                            ? "#f8fafc"
                            : "rgba(0,0,0,0.24)",
                        transform: active ? "translateY(-2px)" : "none",
                        transition: "transform 0.12s ease, border-color 0.12s ease",
                      }}
                    >
                      <img
                        src={hero.spritePath}
                        alt={hero.name}
                        style={{
                          width: "42px",
                          height: "42px",
                          objectFit: "contain",
                          filter: unlocked ? "none" : "grayscale(90%) brightness(0.75)",
                        }}
                      />
                      {!unlocked && (
                        <span
                          style={{
                            position: "absolute",
                            top: "3px",
                            right: "3px",
                            fontSize: "9px",
                            fontWeight: 800,
                            backgroundColor: "rgba(0,0,0,0.78)",
                            color: "#fbbf24",
                            borderRadius: "6px",
                            padding: "1px 4px",
                          }}
                        >
                          🔒{hero.unlockLevel}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: active ? 800 : 600,
                          color: unlocked
                            ? isOffice
                              ? "#0f172a"
                              : "#fafaf9"
                            : isOffice
                              ? "#64748b"
                              : "#a8a29e",
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
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: isOffice ? "#b45309" : "#fde047",
                  }}
                >
                  {lockNotice}
                </div>
              )}
            </div>

            {/* Solo Difficulty Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: isOffice ? "#475569" : "#d6d3d1",
                }}
              >
                {isOffice ? "Seviye:" : "Zorluk:"}
              </span>
              <div
                style={{
                  display: "inline-flex",
                  padding: "3px",
                  borderRadius: "10px",
                  backgroundColor: isOffice ? "#f1f5f9" : "rgba(0,0,0,0.28)",
                  border: isOffice ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.12)",
                  gap: "3px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSoloDifficulty("medium")}
                  style={{
                    border: "none",
                    borderRadius: "7px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    backgroundColor:
                      soloDifficulty === "medium"
                        ? isOffice
                          ? "#ffffff"
                          : "#f59e0b"
                        : "transparent",
                    color:
                      soloDifficulty === "medium"
                        ? isOffice
                          ? "#b45309"
                          : "#18181b"
                        : isOffice
                          ? "#64748b"
                          : "#d6d3d1",
                    boxShadow:
                      soloDifficulty === "medium" && isOffice
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  🔥 Orta
                </button>
                <button
                  type="button"
                  onClick={() => setSoloDifficulty("hard")}
                  style={{
                    border: "none",
                    borderRadius: "7px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    backgroundColor:
                      soloDifficulty === "hard"
                        ? isOffice
                          ? "#fee2e2"
                          : "#e11d48"
                        : "transparent",
                    color:
                      soloDifficulty === "hard"
                        ? isOffice
                          ? "#b91c1c"
                          : "#ffffff"
                        : isOffice
                          ? "#64748b"
                          : "#d6d3d1",
                  }}
                >
                  👑 Zor (1.5x Skor)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
              <button
                onClick={() => onSelectGame(firstGame.id, "solo", soloDifficulty, selectedHeroId)}
                style={{
                  ...styles.heroPlayBtn,
                  marginTop: 0,
                  backgroundColor: isOffice ? "#2563eb" : "#f05232",
                  borderBottom: isOffice ? "3px solid #1d4ed8" : "4px solid #c93b1e",
                }}
              >
                <Play size={17} fill="#ffffff" />{" "}
                {isOffice ? "Tek Kişilik Başlat" : "Tek Kişilik Oyna"}
              </button>

              <button
                onClick={() =>
                  onSelectGame(firstGame.id, "multiplayer", soloDifficulty, selectedHeroId)
                }
                style={{
                  ...styles.heroPlayBtn,
                  marginTop: 0,
                  backgroundColor: isOffice ? "#f1f5f9" : "#2f3d36",
                  color: isOffice ? "#0f172a" : "#ffffff",
                  border: isOffice ? "1px solid #cbd5e1" : "1px solid #4a5d53",
                  borderBottom: isOffice ? "3px solid #cbd5e1" : "4px solid #1b2420",
                }}
              >
                <Users size={17} /> {isOffice ? "Ekip Odası (Çoklu)" : "Çok Oyunculu"}
              </button>
            </div>
          </div>

          {/* Preview Box (Adapts to Office Diagram vs Dark Courtyard Arena) */}
          <div
            style={{
              ...styles.heroPreview,
              backgroundColor: isOffice ? "#f8fafc" : "#2f3d36",
              border: isOffice ? "1px solid #cbd5e1" : "3px solid #3f5047",
            }}
            onClick={() => onSelectGame(firstGame.id, "solo", soloDifficulty, selectedHeroId)}
            title="Tek kişilik hemen başlatmak için tıkla"
          >
            <div
              style={{
                ...styles.previewArenaRing,
                border: isOffice
                  ? "1.5px dashed #94a3b8"
                  : "2px dashed rgba(251, 191, 36, 0.35)",
              }}
            >
              <div
                style={{
                  ...styles.previewObstacle1,
                  backgroundColor: isOffice ? "#cbd5e1" : "#78716c",
                  border: isOffice ? "1.5px solid #94a3b8" : "2px solid #a8a29e",
                }}
              />
              <div
                style={{
                  ...styles.previewObstacle2,
                  backgroundColor: isOffice ? "#e2e8f0" : "#57534e",
                  border: isOffice ? "1.5px solid #64748b" : "2px solid #fbbf24",
                }}
              />
              <div
                style={{
                  ...styles.previewPlayer,
                  backgroundColor: isOffice ? "#2563eb" : "#3b82f6",
                  border: isOffice ? "2px solid #ffffff" : "3px solid #ffffff",
                }}
              />
              <div
                style={{
                  ...styles.previewEnemy1,
                  backgroundColor: isOffice ? "#94a3b8" : "#dc2626",
                  border: isOffice ? "1.5px solid #64748b" : "2px solid #7f1d1d",
                }}
              />
              <div
                style={{
                  ...styles.previewEnemy2,
                  backgroundColor: isOffice ? "#cbd5e1" : "#ea580c",
                  border: isOffice ? "1.5px solid #64748b" : "2px solid #7c2d12",
                }}
              />
              <div
                style={{
                  ...styles.previewCoin1,
                  backgroundColor: isOffice ? "#10b981" : "#fbbf24",
                }}
              />
            </div>
            <div
              style={{
                ...styles.previewOverlayText,
                backgroundColor: isOffice ? "#ffffff" : "#18181b",
                color: isOffice ? "#334155" : "#ffffff",
                border: isOffice ? "1px solid #e2e8f0" : "none",
              }}
            >
              {isOffice ? "Diyagramı Başlat" : "Savaşa Katıl"}
            </div>
          </div>
        </section>

        {/* Active Games Section */}
        <section>
          <div style={styles.sectionHeader}>
            <h2
              style={{
                ...styles.sectionTitle,
                color: isOffice ? "#0f172a" : "#fafaf9",
              }}
            >
              {isOffice ? "Aktif Uygulamalar" : "Yayındaki Oyunlar"}
            </h2>
            <span
              style={{
                ...styles.gameCount,
                backgroundColor: isOffice ? "#e2e8f0" : "#27282e",
                color: isOffice ? "#334155" : "#a1a1aa",
              }}
            >
              {isOffice ? "1 Modül" : "1 Oyun"}
            </span>
          </div>

          <div style={styles.grid}>
            {GAMES_REGISTRY.map((game) => (
              <div
                key={game.id}
                style={{
                  ...styles.card,
                  cursor: "default",
                  backgroundColor: isOffice ? "#ffffff" : "#1e1f24",
                  border: isOffice ? "1px solid #cbd5e1" : "1px solid #2e3038",
                  borderBottom: isOffice ? "2px solid #cbd5e1" : "4px solid #121317",
                }}
              >
                <div
                  onClick={() => onSelectGame(game.id, "solo", soloDifficulty, selectedHeroId)}
                  style={{
                    ...styles.cardThumb,
                    cursor: "pointer",
                    backgroundColor: isOffice ? "#f1f5f9" : game.gradient,
                  }}
                >
                  {game.badge && (
                    <span
                      style={{
                        ...styles.cardBadge,
                        backgroundColor: isOffice ? "#dbeafe" : "#16a34a",
                        color: isOffice ? "#1d4ed8" : "#ffffff",
                      }}
                    >
                      {isOffice ? "AKTİF" : game.badge}
                    </span>
                  )}
                  <div
                    style={{
                      ...styles.cardIconWrap,
                      backgroundColor: isOffice ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
                      border: isOffice
                        ? "1px solid #cbd5e1"
                        : "2px solid rgba(251, 191, 36, 0.45)",
                    }}
                  >
                    {isOffice ? (
                      <LayoutGrid size={30} color="#2563eb" />
                    ) : (
                      <Swords size={34} color="#fbbf24" strokeWidth={2.2} />
                    )}
                  </div>
                  <span
                    style={{
                      ...styles.cardCategoryTag,
                      backgroundColor: isOffice ? "#ffffff" : "rgba(24, 24, 27, 0.78)",
                      color: isOffice ? "#475569" : "#f4f4f5",
                      border: isOffice ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    {isOffice ? "Tek & Ekip" : "Tek & Çok Oyunculu"}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <h3
                    style={{
                      ...styles.cardTitle,
                      color: isOffice ? "#0f172a" : "#ffffff",
                    }}
                  >
                    {isOffice ? "Arena 2D — Akış Simülasyonu" : game.title}
                  </h3>
                  <p
                    style={{
                      ...styles.cardSubtitle,
                      color: isOffice ? "#475569" : "#a1a1aa",
                    }}
                  >
                    {game.subtitle}
                  </p>
                  <div
                    style={{
                      ...styles.cardFooter,
                      borderTop: isOffice ? "1px solid #f1f5f9" : "1px solid #2e3038",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectGame(game.id, "solo", soloDifficulty, selectedHeroId)}
                      style={{
                        ...styles.playPill,
                        border: "none",
                        cursor: "pointer",
                        flex: 1,
                        justifyContent: "center",
                        fontFamily: "inherit",
                        backgroundColor: isOffice ? "#2563eb" : "#f05232",
                        borderBottom: isOffice ? "2px solid #1d4ed8" : "2px solid #c93b1e",
                      }}
                    >
                      <Play size={12} fill="#ffffff" /> Tek Kişilik
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectGame(game.id, "multiplayer", soloDifficulty, selectedHeroId)
                      }
                      style={{
                        ...styles.playPill,
                        cursor: "pointer",
                        flex: 1,
                        justifyContent: "center",
                        fontFamily: "inherit",
                        backgroundColor: isOffice ? "#f1f5f9" : "#27282e",
                        color: isOffice ? "#0f172a" : "#ffffff",
                        border: isOffice ? "1px solid #cbd5e1" : "1px solid #3f3f46",
                      }}
                    >
                      <Users size={12} /> Çok Oyunculu
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic SEO Guide & FAQ Section (Helps players discover Sitecont Game on Google) */}
        <section
          aria-label="Oyun Hakkında ve Sıkça Sorulan Sorular"
          style={{
            marginTop: "28px",
            padding: "22px 24px",
            borderRadius: "18px",
            backgroundColor: isOffice ? "#ffffff" : "#1e1f24",
            border: isOffice ? "1px solid #cbd5e1" : "1px solid #2e3038",
            color: isOffice ? "#334155" : "#a1a1aa",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "17px",
                fontWeight: 800,
                color: isOffice ? "#0f172a" : "#fafaf9",
              }}
            >
              İndirmeden Ücretsiz Çok Oyunculu &amp; Tek Kişilik Tarayıcı Oyunları
            </h2>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.65 }}>
              <b>Sitecont Game</b>, telefon, tablet ve bilgisayardan hiçbir kurulum yapmadan anında
              oynayabileceğiniz ücretsiz <b>online arena ve hayatta kalma oyunları</b> sunar.{" "}
              <b>Survival Arena 2D</b> ile ister tek başınıza giriş yapmadan dalgalara karşı hayatta
              kalın, ister arkadaşlarınızla özel oda kurup <b>Co-op (işbirliği)</b> veya{" "}
              <b>PvP (serbest savaş)</b> modunda <b>Dev Boss</b> savaşlarına katılın.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <article
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: isOffice ? "#f8fafc" : "#16171a",
                border: isOffice ? "1px solid #e2e8f0" : "1px solid #27272a",
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: isOffice ? "#0f172a" : "#ffffff",
                }}
              >
                Arkadaşlarla Online Oda Kurma
              </h3>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.55 }}>
                Çok oyunculu modda tek tıkla <b>Özel Oda</b> oluşturup davet linkini paylaşın.
                Arkadaşlarınızla aynı arenada canlı sohbet ederek Dev Boss’ları birlikte devirin.
              </p>
            </article>

            <article
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: isOffice ? "#f8fafc" : "#16171a",
                border: isOffice ? "1px solid #e2e8f0" : "1px solid #27272a",
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: isOffice ? "#0f172a" : "#ffffff",
                }}
              >
                Orta &amp; Zor Dalgalar + Dev Boss’lar
              </h3>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.55 }}>
                Her 25 saniyede düşmanlar güçlenir; Orta modda her 3. dalgada, Zor modda (1.5x Skor)
                her 2. dalgada minyon çağıran <b>Dev Boss</b> arenaya iner.
              </p>
            </article>

            <article
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: isOffice ? "#f8fafc" : "#16171a",
                border: isOffice ? "1px solid #e2e8f0" : "1px solid #27272a",
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: isOffice ? "#0f172a" : "#ffffff",
                }}
              >
                Mobil &amp; Bilgisayar Uyumlu Kontroller
              </h3>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.55 }}>
                Mobilde takip eden sanal joystick, otomatik ateş ve <b>Atıl (Dash)</b> kaçış
                butonuyla akıcı oynanış; bilgisayarda <b>W A S D</b>, sürükleme ve <b>Space</b>{" "}
                desteği.
              </p>
            </article>
          </div>
        </section>

        <footer
          style={{
            marginTop: "18px",
            paddingBottom: "24px",
            textAlign: "center",
            fontSize: "12px",
            color: isOffice ? "#64748b" : "#71717a",
          }}
        >
          © {new Date().getFullYear()} Sitecont Game — Ücretsiz Çok Oyunculu &amp; Tek Kişilik
          Tarayıcı Oyunları (game.sitecont.io)
        </footer>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 26px",
    gap: "16px",
    flexWrap: "wrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  brandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTextRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  brandTitle: {
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "-0.3px",
  },
  brandAccent: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  rightControls: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  themeSwitch: {
    display: "flex",
    alignItems: "center",
    padding: "3px",
    borderRadius: "10px",
    gap: "2px",
  },
  themeBtn: {
    border: "none",
    borderRadius: "7px",
    padding: "6px 11px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  userBadge: {
    borderRadius: "10px",
    padding: "7px 13px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  loginNavBtn: {
    border: "none",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "8px 15px",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontFamily: "inherit",
  },
  logoutBtn: {
    borderRadius: "10px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "26px",
    maxWidth: "1120px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  officeTipBar: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e40af",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  heroCard: {
    borderRadius: "20px",
    padding: "28px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "28px",
    flexWrap: "wrap",
  },
  heroLeft: {
    flex: "1 1 420px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    alignItems: "flex-start",
  },
  heroBadge: {
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 11px",
    borderRadius: "7px",
    letterSpacing: "0.4px",
  },
  heroTitle: {
    fontSize: "30px",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.4px",
  },
  heroDesc: {
    fontSize: "14px",
    lineHeight: 1.6,
    margin: 0,
    maxWidth: "540px",
  },
  heroMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  metaChip: {
    padding: "6px 12px",
    borderRadius: "9px",
    fontSize: "12px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  heroPlayBtn: {
    marginTop: "6px",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "13px 26px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    fontFamily: "inherit",
  },
  heroPreview: {
    width: "280px",
    height: "196px",
    borderRadius: "16px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
  },
  previewArenaRing: {
    width: "146px",
    height: "146px",
    borderRadius: "50%",
    position: "relative",
  },
  previewPlayer: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    position: "absolute",
    top: "60px",
    left: "60px",
  },
  previewObstacle1: {
    width: "26px",
    height: "26px",
    borderRadius: "7px",
    position: "absolute",
    top: "24px",
    left: "22px",
  },
  previewObstacle2: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    position: "absolute",
    bottom: "22px",
    right: "22px",
  },
  previewEnemy1: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    position: "absolute",
    top: "16px",
    right: "26px",
  },
  previewEnemy2: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    position: "absolute",
    bottom: "18px",
    left: "20px",
  },
  previewCoin1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "1.5px solid #ffffff",
    position: "absolute",
    top: "44px",
    right: "18px",
  },
  previewOverlayText: {
    position: "absolute",
    bottom: "10px",
    padding: "4px 12px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: 700,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 800,
    margin: 0,
  },
  gameCount: {
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "8px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    borderRadius: "16px",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  },
  cardThumb: {
    height: "144px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    fontSize: "10px",
    fontWeight: 800,
    padding: "4px 9px",
    borderRadius: "7px",
    letterSpacing: "0.4px",
  },
  cardCategoryTag: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: "7px",
  },
  cardIconWrap: {
    width: "66px",
    height: "66px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: 800,
    margin: 0,
  },
  cardSubtitle: {
    fontSize: "13px",
    margin: 0,
    lineHeight: 1.45,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "8px",
    paddingTop: "12px",
  },
  playersLabel: {
    fontSize: "12px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  playPill: {
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 800,
    padding: "6px 14px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
};
