import React, { useState, useEffect } from "react";
import { Flame, Heart, Skull, Sun, Moon, Trophy, Users, Menu, X } from "lucide-react";
import { EventBus } from "../game/EventBus";
import { useTheme } from "../theme/ThemeContext";
import { AdSlot } from "../ads/AdSlot";

interface SoloStats {
  wave: number;
  enemyCount: number;
  hp: number;
  maxHp: number;
  kills: number;
  score: number;
  bombs?: number;
  maxBombs?: number;
  isDead: boolean;
  respawnTimer: number;
  difficulty?: "medium" | "hard";
  bossActive?: boolean;
}

interface SoloHUDProps {
  onBackToPortal: () => void;
  onSwitchToMultiplayer: () => void;
}

const BEST_SCORE_KEY = "sitecont_solo_best_score";

export const SoloHUD: React.FC<SoloHUDProps> = ({
  onBackToPortal,
  onSwitchToMultiplayer,
}) => {
  const { isOffice, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashReadyAt, setDashReadyAt] = useState(0);
  const [bombReadyAt, setBombReadyAt] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [levelToast, setLevelToast] = useState<{
    level: number;
    heroName?: string;
    heroTagline?: string;
    heroSprite?: string;
    heroAccent?: string;
  } | null>(null);
  const [stats, setStats] = useState<SoloStats>({
    wave: 1,
    enemyCount: 6,
    hp: 100,
    maxHp: 100,
    kills: 0,
    score: 0,
    bombs: 0,
    maxBombs: 5,
    isDead: false,
    respawnTimer: 0,
    difficulty: "medium",
    bossActive: false,
  });

  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(BEST_SCORE_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onStats = (next: SoloStats) => {
      setStats(next);
      setBestScore((prev) => {
        if (next.score > prev) {
          try {
            localStorage.setItem(BEST_SCORE_KEY, String(next.score));
          } catch {
            // ignore
          }
          return next.score;
        }
        return prev;
      });
    };

    const onDashCooldown = (payload: { durationMs: number }) => {
      setDashReadyAt(Date.now() + (payload?.durationMs || 2200));
      setNowTick(Date.now());
    };

    const onBombCooldown = (payload: { durationMs: number }) => {
      setBombReadyAt(Date.now() + (payload?.durationMs || 550));
      setNowTick(Date.now());
    };

    let toastTimer: number | undefined;
    const onLevelUp = (payload: {
      level: number;
      unlockedHero?: {
        name: string;
        tagline?: string;
        spritePath: string;
        accent?: string;
      } | null;
    }) => {
      setLevelToast({
        level: payload.level,
        heroName: payload.unlockedHero?.name,
        heroTagline: payload.unlockedHero?.tagline,
        heroSprite: payload.unlockedHero?.spritePath,
        heroAccent: payload.unlockedHero?.accent,
      });
      if (toastTimer) window.clearTimeout(toastTimer);
      // Only auto-dismiss if no new hero unlocked; hero unlocks wait for player's tap!
      if (!payload.unlockedHero) {
        toastTimer = window.setTimeout(() => setLevelToast(null), 3500);
      }
    };

    EventBus.on("solo-stats-updated", onStats);
    EventBus.on("dash-cooldown", onDashCooldown);
    EventBus.on("bomb-cooldown", onBombCooldown);
    EventBus.on("level-up", onLevelUp);
    return () => {
      if (toastTimer) window.clearTimeout(toastTimer);
      EventBus.off("solo-stats-updated", onStats);
      EventBus.off("dash-cooldown", onDashCooldown);
      EventBus.off("bomb-cooldown", onBombCooldown);
      EventBus.off("level-up", onLevelUp);
    };
  }, []);

  useEffect(() => {
    const latestEnd = Math.max(dashReadyAt, bombReadyAt);
    if (latestEnd <= Date.now()) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNowTick(t);
      if (t >= latestEnd) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [dashReadyAt, bombReadyAt]);

  const handleCloseUnlockModal = () => {
    setLevelToast(null);
    EventBus.emit("resume-after-unlock");
  };

  const panelBg = isOffice ? "#ffffff" : "rgba(28, 25, 23, 0.88)";
  const panelBorder = isOffice ? "1px solid #cbd5e1" : "1px solid #44403c";
  const panelText = isOffice ? "#0f172a" : "#fafaf9";
  const isHard = stats.difficulty === "hard";
  const dashRemainingSec = Math.max(0, (dashReadyAt - nowTick) / 1000);
  const dashReady = dashRemainingSec <= 0.05;
  const bombCount = Math.max(0, Math.min(stats.maxBombs ?? 5, stats.bombs ?? 0));
  const bombRemainingSec = Math.max(0, (bombReadyAt - nowTick) / 1000);
  const bombReady = bombCount > 0 && bombRemainingSec <= 0.05;

  return (
    <div style={styles.overlay}>
      {levelToast && levelToast.heroName ? (
        /* 🎉 GRAND HERO UNLOCK CELEBRATION MODAL */
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(9, 9, 11, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            pointerEvents: "auto",
            zIndex: 80,
          }}
        >
          <div
            style={{
              width: "330px",
              maxWidth: "92vw",
              backgroundColor: isOffice ? "#ffffff" : "#1c1917",
              border: `3px solid ${levelToast.heroAccent || "#fbbf24"}`,
              borderRadius: "24px",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "10px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.65)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                padding: "4px 12px",
                borderRadius: "999px",
                backgroundColor: "#fbbf24",
                color: "#18181b",
              }}
            >
              🎉 MÜJDE! SEVİYE {levelToast.level} OLDUN!
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: isOffice ? "#475569" : "#d6d3d1",
              }}
            >
              YENİ KAHRAMAN AÇILDI
            </div>

            <div
              style={{
                width: "148px",
                height: "148px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${levelToast.heroAccent || "#fbbf24"}38 0%, transparent 72%)`,
                border: `2px dashed ${levelToast.heroAccent || "#fbbf24"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "4px 0",
              }}
            >
              {levelToast.heroSprite && (
                <img
                  src={levelToast.heroSprite}
                  alt={levelToast.heroName}
                  style={{ width: "126px", height: "126px", objectFit: "contain" }}
                />
              )}
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: isOffice ? "#0f172a" : "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              {levelToast.heroName}
            </div>

            {levelToast.heroTagline && (
              <div
                style={{
                  fontSize: "12px",
                  color: isOffice ? "#475569" : "#a8a29e",
                  lineHeight: 1.45,
                  maxWidth: "260px",
                }}
              >
                {levelToast.heroTagline}
              </div>
            )}

            <button
              type="button"
              onClick={handleCloseUnlockModal}
              style={{
                marginTop: "6px",
                width: "100%",
                padding: "12px 18px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: "#f05232",
                borderBottom: "4px solid #c93b1e",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✅ Devam Et (Karakteri ana menüden seçebilirsin)
            </button>
          </div>
        </div>
      ) : levelToast ? (
        <div
          style={{
            position: "absolute",
            top: isMobile ? "82px" : "96px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: isOffice ? "#ffffff" : "rgba(24, 24, 27, 0.96)",
            border: "2px solid #fbbf24",
            color: isOffice ? "#0f172a" : "#fef3c7",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: 900,
            boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            zIndex: 55,
            whiteSpace: "nowrap",
          }}
        >
          🎉 SEVİYE {levelToast.level}! Harika gidiyorsun!
        </div>
      ) : null}
      {stats.bossActive && !stats.isDead && (
        <div
          style={{
            position: "absolute",
            top: isMobile ? "48px" : "62px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: isOffice ? "#fef2f2" : "rgba(159, 18, 57, 0.94)",
            border: isOffice ? "1.5px solid #dc2626" : "2px solid #fbbf24",
            color: isOffice ? "#b91c1c" : "#fef3c7",
            borderRadius: "999px",
            padding: "4px 14px",
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: 900,
            letterSpacing: "0.06em",
            boxShadow: isOffice
              ? "0 4px 12px rgba(220,38,38,0.14)"
              : "0 6px 20px rgba(190,18,60,0.45)",
            zIndex: 35,
            whiteSpace: "nowrap",
          }}
        >
          {isOffice ? "⚠ YÜKSEK ÖNCELİKLİ SÜREÇ AKTİF" : "👑 DEV BOSS GELDİ!"}
        </div>
      )}

      {stats.isDead && (
        <div
          style={{
            ...styles.deadModal,
            backgroundColor: isOffice ? "#ffffff" : "rgba(28, 25, 23, 0.95)",
            border: isOffice ? "2px solid #94a3b8" : "2px solid #f05232",
          }}
        >
          {!isOffice && <Skull size={36} color="#f05232" />}
          <div style={{ fontSize: "19px", fontWeight: 800, color: panelText }}>
            {isOffice ? "Yeniden Başlatılıyor..." : "ÖLDÜNÜZ!"}
          </div>
          <div style={{ fontSize: "13px", color: isOffice ? "#475569" : "#d6d3d1" }}>
            {Math.max(1, Math.ceil(stats.respawnTimer))} saniye içinde devam ediliyor...
          </div>
          <AdSlot slotKey="respawn_intermission" style={{ marginTop: "10px" }} />
        </div>
      )}

      {isMobile ? (
        /* ULTRA-CLEAN MOBILE TOP STRIP (Zero clutter!) */
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <div
            style={{
              ...styles.badge,
              padding: "5px 9px",
              fontSize: "11px",
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
          >
            <span style={{ fontWeight: 800, color: isOffice ? "#2563eb" : "#fbbf24" }}>
              D{stats.wave}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                padding: "1px 4px",
                borderRadius: "4px",
                backgroundColor: isHard ? "rgba(220,38,38,0.28)" : "rgba(245,158,11,0.22)",
                color: isHard ? "#fca5a5" : "#fcd34d",
              }}
            >
              {isHard ? "ZOR" : "ORTA"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                ...styles.statsBox,
                padding: "5px 9px",
                gap: "7px",
                backgroundColor: panelBg,
                border: panelBorder,
                color: panelText,
              }}
            >
              <Heart size={12} color="#ef4444" fill="#ef4444" />
              <div style={{ ...styles.hpOuter, width: "44px" }}>
                <div
                  style={{
                    ...styles.hpInner,
                    width: `${Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100))}%`,
                    backgroundColor:
                      stats.hp > 50 ? "#22c55e" : stats.hp > 25 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span style={{ fontWeight: 800, fontSize: "11px", color: isOffice ? "#0f172a" : "#fbbf24" }}>
                ⭐ {stats.score}
              </span>
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMobileMenuOpen((v) => !v)}
              style={{
                ...styles.chipBtn,
                padding: "6px 8px",
                backgroundColor: panelBg,
                border: panelBorder,
                color: panelText,
              }}
              aria-label="Menü"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      ) : (
        /* DESKTOP FULL TOP BAR */
        <div style={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={onBackToPortal}
              style={{
                ...styles.portalBtn,
                backgroundColor: isOffice ? "#2563eb" : "#f05232",
                borderBottom: isOffice ? "2px solid #1d4ed8" : "3px solid #c93b1e",
              }}
            >
              {isOffice ? "Workspace" : "SITECONT GAME"}
            </button>

            <button
              onClick={toggleTheme}
              style={{
                ...styles.chipBtn,
                backgroundColor: panelBg,
                border: panelBorder,
                color: panelText,
              }}
            >
              {isOffice ? <Moon size={14} color="#2563eb" /> : <Sun size={14} color="#fbbf24" />}
              <span>{isOffice ? "Eğlence Modu" : "Açık Mod"}</span>
            </button>

            <div
              style={{
                ...styles.badge,
                backgroundColor: panelBg,
                border: panelBorder,
                color: panelText,
              }}
            >
              {!isOffice && <Flame size={15} color="#f97316" />}
              <span style={{ fontWeight: 800, color: isOffice ? "#2563eb" : "#fbbf24" }}>
                {isOffice ? `Aşama ${stats.wave}` : `DALGA ${stats.wave}`}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "6px",
                  backgroundColor: isHard
                    ? isOffice
                      ? "#fee2e2"
                      : "rgba(220,38,38,0.28)"
                    : isOffice
                      ? "#fef3c7"
                      : "rgba(245,158,11,0.22)",
                  color: isHard
                    ? isOffice
                      ? "#b91c1c"
                      : "#fca5a5"
                    : isOffice
                      ? "#b45309"
                      : "#fcd34d",
                }}
              >
                {isHard ? "ZOR" : "ORTA"}
              </span>
              <span style={{ color: "#64748b" }}>•</span>
              <span style={{ fontSize: "12px", color: isOffice ? "#475569" : "#f87171", fontWeight: 600 }}>
                {isOffice ? `${stats.enemyCount} Kayıt` : `${stats.enemyCount} Düşman`}
              </span>
            </div>

            <button
              onClick={onSwitchToMultiplayer}
              style={{
                ...styles.chipBtn,
                backgroundColor: panelBg,
                border: panelBorder,
                color: isOffice ? "#2563eb" : "#4ade80",
              }}
              title="Arkadaşlarınla online oynamak için Çok Oyunculu moda geç"
            >
              <Users size={14} />
              <span>Çok Oyunculu</span>
            </button>
          </div>

          <div
            style={{
              ...styles.statsBox,
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Heart size={13} color="#ef4444" fill="#ef4444" />
              <div style={styles.hpOuter}>
                <div
                  style={{
                    ...styles.hpInner,
                    width: `${Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100))}%`,
                    backgroundColor:
                      stats.hp > 50 ? "#22c55e" : stats.hp > 25 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700 }}>{stats.hp}</span>
            </div>

            <span style={{ fontWeight: 700, color: isOffice ? "#475569" : "#f87171" }}>
              {isOffice ? `${stats.kills} işlem` : `💀 ${stats.kills}`}
            </span>
            <span style={{ fontWeight: 800, color: isOffice ? "#0f172a" : "#fbbf24" }}>
              {isOffice ? `${stats.score}p` : `⭐ ${stats.score}`}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "#64748b",
              }}
              title="En Yüksek Rekor"
            >
              <Trophy size={12} color="#f59e0b" /> {bestScore}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Collapsible Menu Drawer */}
      {isMobile && mobileMenuOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "48px",
            right: "12px",
            width: "210px",
            backgroundColor: isOffice ? "#ffffff" : "rgba(24, 24, 27, 0.96)",
            border: panelBorder,
            borderRadius: "14px",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            pointerEvents: "auto",
            zIndex: 60,
            boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: "11px", color: "#9ca3af", display: "flex", justifyContent: "space-between", padding: "2px 4px" }}>
            <span>💀 {stats.kills} Öldürme</span>
            <span>🏆 Rekor: {bestScore}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setMobileMenuOpen(false);
            }}
            style={{
              ...styles.chipBtn,
              justifyContent: "flex-start",
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
          >
            {isOffice ? <Moon size={14} color="#2563eb" /> : <Sun size={14} color="#fbbf24" />}
            <span>{isOffice ? "Eğlence Modu" : "Açık Mod"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onSwitchToMultiplayer();
            }}
            style={{
              ...styles.chipBtn,
              justifyContent: "flex-start",
              backgroundColor: panelBg,
              border: panelBorder,
              color: isOffice ? "#2563eb" : "#4ade80",
            }}
          >
            <Users size={14} />
            <span>Çok Oyunculu Mod</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onBackToPortal();
            }}
            style={{
              ...styles.portalBtn,
              textAlign: "center",
              backgroundColor: isOffice ? "#2563eb" : "#f05232",
              borderBottom: isOffice ? "2px solid #1d4ed8" : "3px solid #c93b1e",
            }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      )}

      {/* Bottom-Right Action Cluster: BOMBA + ATIL */}
      {!stats.isDead && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: isMobile ? "18px" : "24px",
            bottom: isMobile ? "24px" : "24px",
            display: "flex",
            alignItems: "flex-end",
            gap: isMobile ? "14px" : "12px",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          {/* Detonate Stacked Bomb Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (bombReady) EventBus.emit("trigger-bomb");
            }}
            style={{
              position: "relative",
              width: isMobile ? "72px" : "68px",
              height: isMobile ? "72px" : "68px",
              borderRadius: "50%",
              pointerEvents: "auto",
              border: bombReady
                ? isOffice
                  ? "2.5px solid #d97706"
                  : "2.5px solid #fbbf24"
                : "2px solid rgba(148, 163, 184, 0.42)",
              backgroundColor: bombReady
                ? isOffice
                  ? "rgba(217, 119, 6, 0.94)"
                  : "rgba(234, 88, 12, 0.9)"
                : bombCount > 0
                  ? "rgba(124, 45, 18, 0.8)"
                  : "rgba(30, 41, 59, 0.58)",
              opacity: bombCount > 0 ? 1 : 0.65,
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1px",
              cursor: bombReady ? "pointer" : "default",
              boxShadow: bombReady
                ? "0 8px 22px rgba(234, 88, 12, 0.45)"
                : "0 4px 12px rgba(0, 0, 0, 0.25)",
              fontFamily: "inherit",
              touchAction: "none",
              transition: "transform 0.1s ease, background-color 0.15s ease, opacity 0.15s ease",
            }}
            title="Biriken Bombayı Patlat (E veya B)"
          >
            {/* Bomb Count Badge */}
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                minWidth: "24px",
                height: "24px",
                padding: "0 5px",
                borderRadius: "999px",
                backgroundColor: bombCount > 0 ? "#fbbf24" : "#475569",
                color: bombCount > 0 ? "#1c1917" : "#e2e8f0",
                border: "2px solid #0f172a",
                fontSize: "11px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {bombCount}
            </span>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>
              {bombRemainingSec > 0.05 ? "💥" : "💣"}
            </span>
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.04em" }}>
              {bombRemainingSec > 0.05
                ? `${bombRemainingSec.toFixed(1)}s`
                : bombCount > 0
                  ? "PATLAT"
                  : "BOMBA"}
            </span>
            {!isMobile && (
              <span style={{ fontSize: "9px", opacity: 0.85, fontWeight: 700, lineHeight: 1 }}>
                [E]
              </span>
            )}
          </button>

          {/* Dash / Dodge Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              EventBus.emit("trigger-dash");
            }}
            style={{
              width: isMobile ? "72px" : "68px",
              height: isMobile ? "72px" : "68px",
              borderRadius: "50%",
              pointerEvents: "auto",
              border: dashReady
                ? isOffice
                  ? "2.5px solid #2563eb"
                  : "2.5px solid #38bdf8"
                : "2px solid rgba(148, 163, 184, 0.45)",
              backgroundColor: dashReady
                ? isOffice
                  ? "rgba(37, 99, 235, 0.92)"
                  : "rgba(14, 165, 233, 0.86)"
                : "rgba(30, 41, 59, 0.72)",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1px",
              cursor: dashReady ? "pointer" : "default",
              boxShadow: dashReady
                ? "0 8px 22px rgba(14, 165, 233, 0.38)"
                : "0 4px 12px rgba(0, 0, 0, 0.25)",
              fontFamily: "inherit",
              touchAction: "none",
              transition: "transform 0.1s ease, background-color 0.15s ease",
            }}
            title="Hızlı Kaçış / Atıl (Space veya Shift)"
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{dashReady ? "💨" : "⏳"}</span>
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.04em" }}>
              {dashReady ? "ATIL" : `${dashRemainingSec.toFixed(1)}s`}
            </span>
            {!isMobile && (
              <span style={{ fontSize: "9px", opacity: 0.85, fontWeight: 700, lineHeight: 1 }}>
                [SPC]
              </span>
            )}
          </button>
        </div>
      )}

      {/* Desktop-Only Bottom-Center Mini Ad Strip (Automatically hidden on Mobile/Tablet) */}
      {!stats.isDead && (
        <AdSlot
          slotKey="ingame_bottom_bar"
          dismissible
          style={{
            position: "absolute",
            bottom: "14px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 35,
          }}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  deadModal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "16px",
    padding: "22px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    zIndex: 50,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  portalBtn: {
    pointerEvents: "auto",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  chipBtn: {
    pointerEvents: "auto",
    borderRadius: "10px",
    padding: "7px 11px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
  },
  badge: {
    pointerEvents: "auto",
    borderRadius: "10px",
    padding: "7px 12px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
  },
  statsBox: {
    pointerEvents: "auto",
    borderRadius: "10px",
    padding: "7px 12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "12px",
  },
  hpOuter: {
    width: "68px",
    height: "8px",
    backgroundColor: "#292524",
    borderRadius: "4px",
    overflow: "hidden",
  },
  hpInner: {
    height: "100%",
    transition: "width 0.15s ease",
  },
};
