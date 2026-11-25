import React, { useState } from "react";
import {
  Gamepad2,
  Search,
  Play,
  Swords,
  Car,
  Trophy,
  Zap,
  Shield,
  Flame,
  Users,
  Sparkles,
  Lock,
} from "lucide-react";
import { GAMES_REGISTRY, GameMetadata } from "./gamesRegistry";

interface PortalHomeProps {
  onSelectGame: (gameId: string) => void;
}

const CATEGORIES = ["Tümü", "Çok Oyunculu", "Aksiyon", "Yarış", "Strateji", "Arcade"] as const;

export const PortalHome: React.FC<PortalHomeProps> = ({ onSelectGame }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [comingSoonNotice, setComingSoonNotice] = useState<string | null>(null);

  const cleanSearch = searchQuery.trim().toLowerCase();

  const filteredGames = GAMES_REGISTRY.filter((g) => {
    const matchesCategory = selectedCategory === "Tümü" || g.category === selectedCategory;
    const matchesSearch =
      !cleanSearch ||
      g.title.toLowerCase().includes(cleanSearch) ||
      g.subtitle.toLowerCase().includes(cleanSearch) ||
      g.category.toLowerCase().includes(cleanSearch);
    return matchesCategory && matchesSearch;
  });

  const featuredGame = GAMES_REGISTRY.find((g) => g.featured) || GAMES_REGISTRY[0];

  const renderIcon = (iconName: GameMetadata["iconName"], size = 34) => {
    switch (iconName) {
      case "swords":
        return <Swords size={size} color="#38bdf8" />;
      case "car":
        return <Car size={size} color="#fb923c" />;
      case "trophy":
        return <Trophy size={size} color="#facc15" />;
      case "zap":
        return <Zap size={size} color="#34d399" />;
      case "shield":
        return <Shield size={size} color="#c084fc" />;
      case "flame":
        return <Flame size={size} color="#fb7185" />;
    }
  };

  const handleCardClick = (game: GameMetadata) => {
    if (game.isPlayable) {
      onSelectGame(game.id);
    } else {
      setComingSoonNotice(
        `"${game.title}" yakında eklenecek! Şu an 1. Oyun olan "Survival Arena 2D"yi oynayabilirsiniz.`
      );
      setTimeout(() => setComingSoonNotice(null), 3500);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top Poki-style Navigation Bar */}
      <header style={styles.navbar}>
        <div style={styles.brand} onClick={() => setSelectedCategory("Tümü")}>
          <div style={styles.brandIcon}>
            <Gamepad2 size={26} color="#ffffff" />
          </div>
          <div>
            <span style={styles.brandTitle}>POKI</span>
            <span style={styles.brandAccent}>ARENA</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.categoryPill,
                  backgroundColor: active ? "#38bdf8" : "rgba(30, 41, 59, 0.8)",
                  color: active ? "#0f172a" : "#cbd5e1",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Oyun ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 40))}
            style={styles.searchInput}
          />
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <main style={styles.mainContent}>
        {comingSoonNotice && (
          <div style={styles.noticeBanner}>
            <Sparkles size={16} color="#facc15" />
            <span>{comingSoonNotice}</span>
          </div>
        )}

        {/* Featured Hero Game Banner (Game #1) */}
        {selectedCategory === "Tümü" && !cleanSearch && (
          <section style={styles.heroCard}>
            <div style={styles.heroLeft}>
              <div style={styles.heroBadge}>
                <Sparkles size={14} /> ÖNE ÇIKAN 1. OYUN • CANLI MULTIPLAYER
              </div>
              <h1 style={styles.heroTitle}>{featuredGame.title}</h1>
              <p style={styles.heroDesc}>
                Üzerine akın eden düşman dalgalarına karşı arkadaşlarınla takım olup savaş (Co-op)
                veya Kaos modunu (PvP) açıp arkadaşlarınla birbirinizi avlayın!
              </p>
              <div style={styles.heroMetaRow}>
                <span style={styles.metaChip}>
                  <Users size={14} color="#38bdf8" /> {featuredGame.playersText}
                </span>
                <span style={styles.metaChip}>🛡️ Co-op & ⚔️ PvP</span>
                <span style={styles.metaChip}>🔗 Davet Koduyla Arkadaş Çağır</span>
              </div>
              <button
                onClick={() => onSelectGame(featuredGame.id)}
                style={styles.heroPlayBtn}
              >
                <Play size={20} fill="#0f172a" /> HEMEN OYNA
              </button>
            </div>

            {/* Visual Arena Illustration on the right */}
            <div
              style={styles.heroPreview}
              onClick={() => onSelectGame(featuredGame.id)}
              title="Oyunu başlatmak için tıkla"
            >
              <div style={styles.previewArenaCircle}>
                <div style={styles.previewPlayer} />
                <div style={styles.previewEnemy1} />
                <div style={styles.previewEnemy2} />
                <div style={styles.previewCoin1} />
                <div style={styles.previewCoin2} />
              </div>
              <div style={styles.previewOverlayText}>▶ Tıkla ve Savaşa Gir</div>
            </div>
          </section>
        )}

        {/* Games Grid Section */}
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              🎯 {selectedCategory === "Tümü" ? "Tüm Oyunlar" : `${selectedCategory} Oyunları`}
            </h2>
            <span style={styles.gameCount}>{filteredGames.length} Oyun</span>
          </div>

          <div style={styles.grid}>
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => handleCardClick(game)}
                style={{
                  ...styles.card,
                  border: game.isPlayable
                    ? "2px solid #38bdf8"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  opacity: game.isPlayable ? 1 : 0.78,
                }}
              >
                {/* Card Thumbnail */}
                <div
                  style={{
                    ...styles.cardThumb,
                    background: game.gradient,
                  }}
                >
                  {game.badge && (
                    <span
                      style={{
                        ...styles.cardBadge,
                        backgroundColor: game.badgeColor || "#38bdf8",
                        color: game.isPlayable ? "#052e16" : "#0f172a",
                      }}
                    >
                      {game.badge}
                    </span>
                  )}

                  <div style={styles.cardIconWrap}>{renderIcon(game.iconName, 40)}</div>

                  <span style={styles.cardCategoryTag}>{game.category}</span>
                </div>

                {/* Card Body */}
                <div style={styles.cardBody}>
                  <div style={styles.cardTitleRow}>
                    <h3 style={styles.cardTitle}>{game.title}</h3>
                  </div>
                  <p style={styles.cardSubtitle}>{game.subtitle}</p>

                  <div style={styles.cardFooter}>
                    <span style={styles.playersLabel}>
                      <Users size={13} /> {game.playersText}
                    </span>

                    {game.isPlayable ? (
                      <span style={styles.playPill}>
                        <Play size={13} fill="#ffffff" /> Oyna
                      </span>
                    ) : (
                      <span style={styles.lockedPill}>
                        <Lock size={12} /> Yakında
                      </span>
                    )}
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
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    gap: "16px",
    flexWrap: "wrap",
    zIndex: 10,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
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
  categoryRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  categoryPill: {
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    padding: "7px 15px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "20px",
    padding: "7px 14px",
    width: "220px",
  },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#ffffff",
    fontSize: "13px",
    width: "100%",
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 28px 48px 28px",
    maxWidth: "1280px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  noticeBanner: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    border: "1px solid rgba(250, 204, 21, 0.4)",
    color: "#fef08a",
    padding: "12px 18px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  heroCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0284c7 100%)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    borderRadius: "24px",
    padding: "28px 32px",
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
    fontSize: "32px",
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
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 8px 25px rgba(56, 189, 248, 0.45)",
  },
  heroPreview: {
    width: "280px",
    height: "190px",
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
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    border: "2px dashed #1e293b",
    position: "relative",
  },
  previewPlayer: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    border: "3px solid #ffffff",
    position: "absolute",
    top: "55px",
    left: "55px",
    boxShadow: "0 0 14px #38bdf8",
  },
  previewEnemy1: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    position: "absolute",
    top: "14px",
    left: "18px",
  },
  previewEnemy2: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    backgroundColor: "#a855f7",
    position: "absolute",
    bottom: "16px",
    right: "14px",
  },
  previewCoin1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#facc15",
    position: "absolute",
    top: "26px",
    right: "28px",
    boxShadow: "0 0 8px #facc15",
  },
  previewCoin2: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#4ade80",
    position: "absolute",
    bottom: "28px",
    left: "24px",
    boxShadow: "0 0 8px #4ade80",
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
    color: "#94a3b8",
    backgroundColor: "#1e293b",
    padding: "4px 10px",
    borderRadius: "12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: "18px",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  },
  cardThumb: {
    height: "140px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    position: "absolute",
    top: "10px",
    left: "10px",
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
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 800,
    margin: 0,
    color: "#ffffff",
  },
  cardSubtitle: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.4,
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
    padding: "5px 12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  lockedPill: {
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
};
