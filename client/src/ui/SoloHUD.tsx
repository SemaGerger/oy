import React, { useState, useEffect } from "react";
import { Flame, Heart, Skull, Sun, Moon, Trophy, Users } from "lucide-react";
import { EventBus } from "../game/EventBus";
import { useTheme } from "../theme/ThemeContext";

interface SoloStats {
  wave: number;
  enemyCount: number;
  hp: number;
  maxHp: number;
  kills: number;
  score: number;
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
  const [stats, setStats] = useState<SoloStats>({
    wave: 1,
    enemyCount: 6,
    hp: 100,
    maxHp: 100,
    kills: 0,
    score: 0,
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

    EventBus.on("solo-stats-updated", onStats);
    return () => {
      EventBus.off("solo-stats-updated", onStats);
    };
  }, []);

  const panelBg = isOffice ? "#ffffff" : "rgba(28, 25, 23, 0.92)";
  const panelBorder = isOffice ? "1px solid #cbd5e1" : "1px solid #44403c";
  const panelText = isOffice ? "#0f172a" : "#fafaf9";
  const isHard = stats.difficulty === "hard";

  return (
    <div style={styles.overlay}>
      {stats.bossActive && !stats.isDead && (
        <div
          style={{
            position: "absolute",
            top: "62px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: isOffice ? "#fef2f2" : "rgba(159, 18, 57, 0.94)",
            border: isOffice ? "1.5px solid #dc2626" : "2px solid #fbbf24",
            color: isOffice ? "#b91c1c" : "#fef3c7",
            borderRadius: "999px",
            padding: "6px 18px",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.06em",
            boxShadow: isOffice
              ? "0 4px 12px rgba(220,38,38,0.14)"
              : "0 6px 20px rgba(190,18,60,0.45)",
            zIndex: 35,
            whiteSpace: "nowrap",
          }}
        >
          {isOffice ? "⚠ YÜKSEK ÖNCELİKLİ SÜREÇ AKTİF" : "👑 DEV BOSS GELDİ! DİKKAT ET!"}
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
        </div>
      )}

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

        {/* Right: HP, Score & Best Score */}
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
