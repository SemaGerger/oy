import React from "react";
import {
  Gamepad2,
  Play,
  Swords,
  Users,
  Sparkles,
  LogOut,
  UserCheck,
} from "lucide-react";
import { GAMES_REGISTRY } from "./gamesRegistry";
import { AuthUser } from "../network/authClient";

interface PortalHomeProps {
  user: AuthUser;
  onSelectGame: (gameId: string) => void;
  onLogout: () => void;
}

export const PortalHome: React.FC<PortalHomeProps> = ({ user, onSelectGame, onLogout }) => {
  const firstGame = GAMES_REGISTRY[0];

  return (
    <div style={styles.page}>
      {/* Top Poki-style Navigation Bar */}
      <header style={styles.navbar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Gamepad2 size={26} color="#ffffff" />
          </div>
          <div>
            <span style={styles.brandTitle}>POKI</span>
            <span style={styles.brandAccent}>ARENA</span>
          </div>
        </div>

        {/* Right: Logged-in User Profile & Logout */}
        <div style={styles.userSection}>
          <div style={styles.userBadge}>
            <UserCheck size={16} color="#22c55e" />
            <span style={{ fontWeight: 700, color: "#ffffff" }}>{user.username}</span>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn} title="Hesaptan çıkış yap">
            <LogOut size={15} /> Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Featured Hero Card (Game #1) */}
        <section style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={styles.heroBadge}>
              <Sparkles size={14} /> 1. OYUN • CANLI MULTIPLAYER
            </div>
            <h1 style={styles.heroTitle}>{firstGame.title}</h1>
            <p style={styles.heroDesc}>
              Kayaların, siper duvarlarının ve enerji sütunlarının arkasına saklanarak üzerine gelen
              düşman dalgalarını yok et! Arkadaşlarınla Co-op takım ol veya PvP modunda birbirinizi
              avlayın.
            </p>
            <div style={styles.heroMetaRow}>
              <span style={styles.metaChip}>
                <Users size={14} color="#38bdf8" /> {firstGame.playersText}
              </span>
              <span style={styles.metaChip}>🪨 Engeller & Siper</span>
              <span style={styles.metaChip}>🛡️ Co-op & ⚔️ PvP</span>
              <span style={styles.metaChip}>🔗 Davet Koduyla Arkadaş Çağır</span>
            </div>
            <button onClick={() => onSelectGame(firstGame.id)} style={styles.heroPlayBtn}>
              <Play size={20} fill="#0f172a" /> HEMEN OYNA
            </button>
          </div>

          {/* Visual Arena Preview */}
          <div
            style={styles.heroPreview}
            onClick={() => onSelectGame(firstGame.id)}
            title="Oyunu başlatmak için tıkla"
          >
            <div style={styles.previewArenaCircle}>
              <div style={styles.previewPlayer} />
              <div style={styles.previewObstacle1} />
              <div style={styles.previewObstacle2} />
              <div style={styles.previewEnemy1} />
              <div style={styles.previewEnemy2} />
              <div style={styles.previewCoin1} />
            </div>
            <div style={styles.previewOverlayText}>▶ Tıkla ve Savaşa Gir</div>
          </div>
        </section>

        {/* Active Game Card */}
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>🎯 Yayındaki Oyunlar</h2>
            <span style={styles.gameCount}>1 Oyun Aktif</span>
          </div>

          <div style={styles.grid}>
            {GAMES_REGISTRY.map((game) => (
              <div
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                style={styles.card}
              >
                <div style={{ ...styles.cardThumb, background: game.gradient }}>
                  {game.badge && (
                    <span style={styles.cardBadge}>{game.badge}</span>
                  )}
                  <div style={styles.cardIconWrap}>
                    <Swords size={42} color="#38bdf8" />
                  </div>
                  <span style={styles.cardCategoryTag}>{game.category}</span>
                </div>

                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{game.title}</h3>
                  <p style={styles.cardSubtitle}>{game.subtitle}</p>
                  <div style={styles.cardFooter}>
                    <span style={styles.playersLabel}>
                      <Users size={13} /> {game.playersText}
                    </span>
                    <span style={styles.playPill}>
                      <Play size={13} fill="#ffffff" /> Oyna
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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
    backgroundColor: "#090d16",
    color: "#ffffff",
    overflow: "hidden",
  },
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 28px",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    gap: "16px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  brandIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(56, 189, 248, 0.35)",
  },
  brandTitle: {
    fontSize: "22px",
    fontWeight: 900,
    letterSpacing: "1px",
    color: "#ffffff",
  },
  brandAccent: {
    fontSize: "22px",
    fontWeight: 900,
    letterSpacing: "1px",
    color: "#38bdf8",
    marginLeft: "2px",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    borderRadius: "20px",
    padding: "7px 14px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fca5a5",
    borderRadius: "12px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "28px",
    maxWidth: "1180px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  heroCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0284c7 100%)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    borderRadius: "24px",
    padding: "30px 34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "28px",
    flexWrap: "wrap",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
  },
  heroLeft: {
    flex: "1 1 420px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    alignItems: "flex-start",
  },
  heroBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    border: "1px solid #22c55e",
    color: "#4ade80",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 12px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  heroTitle: {
    fontSize: "34px",
    fontWeight: 900,
    margin: 0,
    color: "#ffffff",
  },
  heroDesc: {
    fontSize: "14px",
    color: "#cbd5e1",
    lineHeight: 1.55,
    margin: 0,
    maxWidth: "560px",
  },
  heroMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  metaChip: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    padding: "5px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  heroPlayBtn: {
    marginTop: "4px",
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "14px",
    padding: "14px 30px",
    fontSize: "15px",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 8px 25px rgba(56, 189, 248, 0.45)",
  },
  heroPreview: {
    width: "290px",
    height: "200px",
    backgroundColor: "#090d16",
    borderRadius: "18px",
    border: "2px solid rgba(56, 189, 248, 0.4)",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
  },
  previewArenaCircle: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    border: "2px dashed #1e293b",
    position: "relative",
  },
  previewPlayer: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    border: "3px solid #ffffff",
    position: "absolute",
    top: "60px",
    left: "60px",
    boxShadow: "0 0 14px #38bdf8",
  },
  previewObstacle1: {
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    backgroundColor: "#475569",
    border: "2px solid #94a3b8",
    position: "absolute",
    top: "26px",
    left: "24px",
  },
  previewObstacle2: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#1e1b4b",
    border: "2px solid #38bdf8",
    position: "absolute",
    bottom: "24px",
    right: "26px",
    boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
  },
  previewEnemy1: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    position: "absolute",
    top: "14px",
    right: "28px",
  },
  previewEnemy2: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "#a855f7",
    position: "absolute",
    bottom: "18px",
    left: "20px",
  },
  previewCoin1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#facc15",
    position: "absolute",
    top: "44px",
    right: "18px",
    boxShadow: "0 0 8px #facc15",
  },
  previewOverlayText: {
    position: "absolute",
    bottom: "10px",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#38bdf8",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "19px",
    fontWeight: 800,
    margin: 0,
  },
  gameCount: {
    fontSize: "12px",
    color: "#4ade80",
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    padding: "4px 12px",
    borderRadius: "12px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#111827",
    border: "2px solid #38bdf8",
    borderRadius: "18px",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  },
  cardThumb: {
    height: "150px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    position: "absolute",
    top: "10px",
    left: "10px",
    backgroundColor: "#22c55e",
    color: "#052e16",
    fontSize: "10px",
    fontWeight: 800,
    padding: "3px 9px",
    borderRadius: "10px",
  },
  cardCategoryTag: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    color: "#cbd5e1",
    fontSize: "10px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "8px",
  },
  cardIconWrap: {
    width: "74px",
    height: "74px",
    borderRadius: "20px",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255, 255, 255, 0.14)",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: 800,
    margin: 0,
    color: "#ffffff",
  },
  cardSubtitle: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.45,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "8px",
    paddingTop: "10px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  },
  playersLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  playPill: {
    backgroundColor: "#0284c7",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    padding: "6px 14px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
};
