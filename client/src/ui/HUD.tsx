import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import {
  Trophy,
  MessageSquare,
  Send,
  Users,
  Compass,
  Shield,
  Swords,
  Copy,
  Check,
  Skull,
  Heart,
  Flame,
  Sun,
  Moon,
} from "lucide-react";
import { EventBus } from "../game/EventBus";
import { useTheme } from "../theme/ThemeContext";

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  kills: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  respawnTimer: number;
  color: string;
  isLocal: boolean;
}

interface GameInfo {
  wave: number;
  gameMode: "coop" | "pvp";
  roomCode: string;
  hostId?: string;
  enemyCount: number;
}

interface ChatMessage {
  id: string;
  name: string;
  color: string;
  text: string;
  time: number;
  isSystem?: boolean;
}

interface KillFeedItem {
  victimName: string;
  killerName: string;
  time: number;
}

interface HUDProps {
  room: Room;
  onBackToPortal?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ room, onBackToPortal }) => {
  const { isOffice, toggleTheme } = useTheme();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo>({
    wave: 1,
    gameMode: "coop",
    roomCode: room.roomId,
    hostId: "",
    enemyCount: 0,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePlayersUpdate = (list: PlayerInfo[]) => {
      setPlayers(list);
    };
    const handleGameInfoUpdate = (info: GameInfo) => {
      setGameInfo(info);
    };

    EventBus.on("players-updated", handlePlayersUpdate);
    EventBus.on("game-info-updated", handleGameInfoUpdate);

    room.onMessage("chat", (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-40), msg]);
    });

    room.onMessage("system_notice", (notice: { text: string }) => {
      setMessages((prev) => [
        ...prev.slice(-40),
        {
          id: "sys",
          name: "SİSTEM",
          color: "#facc15",
          text: notice.text,
          time: Date.now(),
          isSystem: true,
        },
      ]);
    });

    room.onMessage("kill_feed", (item: KillFeedItem) => {
      setKillFeed((prev) => [...prev.slice(-4), item]);
    });

    return () => {
      EventBus.off("players-updated", handlePlayersUpdate);
      EventBus.off("game-info-updated", handleGameInfoUpdate);
    };
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    room.send("chat", chatInput.trim());
    setChatInput("");
  };

  const handleToggleMode = () => {
    room.send("toggle_mode");
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${room.roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const localPlayer = players.find((p) => p.isLocal);
  const isPvp = gameInfo.gameMode === "pvp";
  const isHost = !gameInfo.hostId || gameInfo.hostId === room.sessionId;

  const panelBg = isOffice ? "#ffffff" : "rgba(28, 25, 23, 0.92)";
  const panelBorder = isOffice ? "1px solid #cbd5e1" : "1px solid #44403c";
  const panelText = isOffice ? "#0f172a" : "#fafaf9";

  return (
    <div style={styles.overlay}>
      {/* Respawn Banner when Local Player is Dead */}
      {localPlayer?.isDead && (
        <div
          style={{
            ...styles.deadModal,
            backgroundColor: isOffice ? "#ffffff" : "rgba(28, 25, 23, 0.95)",
            border: isOffice ? "2px solid #94a3b8" : "2px solid #f05232",
            boxShadow: isOffice ? "0 8px 24px rgba(15,23,42,0.12)" : "0 0 30px rgba(0,0,0,0.5)",
          }}
        >
          {!isOffice && <Skull size={38} color="#f05232" />}
          <div style={{ fontSize: "19px", fontWeight: 800, color: panelText }}>
            {isOffice ? "Yeniden Senkronize Ediliyor..." : "ÖLDÜNÜZ!"}
          </div>
          <div style={{ fontSize: "13px", color: isOffice ? "#475569" : "#d6d3d1" }}>
            {isOffice
              ? `Bağlantı yenileniyor (${Math.max(1, Math.ceil(localPlayer.respawnTimer))} sn)`
              : `Yeniden doğuluyor... (${Math.max(1, Math.ceil(localPlayer.respawnTimer))} sn)`}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={styles.topBar}>
        {/* Left Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {onBackToPortal && (
            <button
              onClick={onBackToPortal}
              style={{
                ...styles.portalHomeBtn,
                backgroundColor: isOffice ? "#2563eb" : "#f05232",
                borderBottom: isOffice ? "2px solid #1d4ed8" : "3px solid #c93b1e",
              }}
              title="Ana sayfaya dön"
            >
              {isOffice ? "Workspace" : "SITECONT GAME"}
            </button>
          )}

          {/* Instant Office (Light) / Fun (Dark) Panic Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              ...styles.inviteBtn,
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
            title="Anında Ofis (Light) / Eğlence (Dark) modu değiştir (Kısayol: Shift + O)"
          >
            {isOffice ? <Moon size={14} color="#2563eb" /> : <Sun size={14} color="#fbbf24" />}
            <span>{isOffice ? "Eğlence Modu" : "Ofis Modu"}</span>
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
              {isOffice ? `Aşama ${gameInfo.wave}` : `DALGA ${gameInfo.wave}`}
            </span>
            <span style={styles.divider}>•</span>
            <span style={{ color: isOffice ? "#475569" : "#f87171", fontSize: "12px", fontWeight: 600 }}>
              {isOffice ? `${gameInfo.enemyCount} Kayıt` : `${gameInfo.enemyCount} Düşman`}
            </span>
            <span style={styles.divider}>•</span>
            <Users size={14} color={isOffice ? "#64748b" : "#a8a29e"} />
            <span style={{ color: isOffice ? "#64748b" : "#a8a29e", fontSize: "12px" }}>
              {players.length} {isOffice ? "Kullanıcı" : "Oyuncu"}
            </span>
          </div>

          {/* Mode Toggle Button */}
          <button
            onClick={handleToggleMode}
            style={{
              ...styles.modeToggleBtn,
              backgroundColor: isOffice
                ? "#ffffff"
                : isPvp
                  ? "rgba(220, 38, 38, 0.9)"
                  : "rgba(22, 163, 74, 0.9)",
              borderColor: isOffice ? "#cbd5e1" : isPvp ? "#ef4444" : "#22c55e",
              color: isOffice ? "#0f172a" : "#ffffff",
              cursor: isHost ? "pointer" : "not-allowed",
            }}
            title={
              isHost
                ? "Oda sahibi olarak oyun modunu değiştirmek için tıkla"
                : "Sadece Oda Sahibi oyun modunu değiştirebilir"
            }
          >
            {isPvp ? <Swords size={14} /> : <Shield size={14} />}
            <span>
              {isOffice
                ? isPvp
                  ? "Mod: Serbest (PvP)"
                  : "Mod: Ortak (Co-op)"
                : isPvp
                  ? "KAOS / PvP"
                  : "CO-OP (Birlikte)"}
            </span>
            {isHost && (
              <span
                style={{
                  ...styles.switchTag,
                  backgroundColor: isOffice ? "#eff6ff" : "rgba(0,0,0,0.28)",
                  color: isOffice ? "#1d4ed8" : "#ffffff",
                }}
              >
                Değiştir
              </span>
            )}
          </button>

          {/* Invite Friend Button */}
          <button
            onClick={handleCopyInvite}
            style={{
              ...styles.inviteBtn,
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
            title="Oda davet linkini kopyala"
          >
            {copied ? (
              <Check size={14} color="#16a34a" />
            ) : (
              <Copy size={14} color={isOffice ? "#2563eb" : "#fbbf24"} />
            )}
            <span>
              {copied ? "Link Kopyalandı!" : `Davet (${room.roomId})`}
            </span>
          </button>
        </div>

        {/* Right: Local Player HP & Score */}
        {localPlayer && (
          <div
            style={{
              ...styles.myStats,
              backgroundColor: panelBg,
              border: panelBorder,
              color: panelText,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: localPlayer.color,
                }}
              />
              <span style={{ fontWeight: 700 }}>{localPlayer.name}</span>
            </div>

            {/* Health Bar */}
            <div style={styles.hpBarWrap}>
              <Heart size={13} color="#ef4444" fill="#ef4444" />
              <div style={styles.hpBarOuter}>
                <div
                  style={{
                    ...styles.hpBarInner,
                    width: `${Math.max(0, Math.min(100, (localPlayer.hp / localPlayer.maxHp) * 100))}%`,
                    backgroundColor:
                      localPlayer.hp > 50 ? "#22c55e" : localPlayer.hp > 25 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700 }}>
                {Math.max(0, Math.round(localPlayer.hp))}/{localPlayer.maxHp}
              </span>
            </div>

            <div style={{ color: "#f87171", fontWeight: 700 }}>💀 {localPlayer.kills}</div>
            <div style={{ color: "#facc15", fontWeight: 700 }}>⭐ {localPlayer.score}</div>
          </div>
        )}
      </div>

      {/* Kill Feed (Top Left below header) */}
      {killFeed.length > 0 && (
        <div style={styles.killFeedContainer}>
          {killFeed.map((k, idx) => (
            <div key={idx} style={styles.killFeedItem}>
              <span style={{ color: "#f87171", fontWeight: 700 }}>{k.killerName}</span>
              <span style={{ color: "#94a3b8", margin: "0 6px" }}>➔</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>{k.victimName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Panel (Top Right) */}
      <div
        style={{
          ...styles.leaderboard,
          backgroundColor: panelBg,
          border: panelBorder,
          color: panelText,
        }}
      >
        <div
          style={{
            ...styles.leaderboardHeader,
            borderBottom: isOffice ? "1px solid #e2e8f0" : "1px solid #292524",
          }}
        >
          {!isOffice && <Trophy size={15} color="#fbbf24" />}
          <span style={{ fontWeight: 800, fontSize: "12px" }}>
            {isOffice ? "PERFORMANS ÖZETİ" : "SKOR & AV TABLOSU"}
          </span>
        </div>
        <div style={styles.leaderboardList}>
          {players.slice(0, 8).map((p, index) => (
            <div
              key={p.id}
              style={{
                ...styles.leaderboardItem,
                backgroundColor: p.isLocal
                  ? isOffice
                    ? "#eff6ff"
                    : "rgba(251, 191, 36, 0.12)"
                  : "transparent",
                borderLeft: p.isLocal
                  ? isOffice
                    ? "3px solid #2563eb"
                    : "3px solid #fbbf24"
                  : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    color: index < 3 ? (isOffice ? "#2563eb" : "#fbbf24") : "#64748b",
                    fontSize: "12px",
                    width: "16px",
                    fontWeight: 700,
                  }}
                >
                  #{index + 1}
                </span>
                <span
                  style={{
                    color: p.isLocal
                      ? isOffice
                        ? "#1d4ed8"
                        : "#fbbf24"
                      : panelText,
                    fontSize: "12px",
                    fontWeight: p.isLocal ? 800 : 500,
                    textDecoration: p.isDead ? "line-through" : "none",
                  }}
                >
                  {p.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                <span style={{ color: isOffice ? "#64748b" : "#f87171" }}>
                  {isOffice ? `${p.kills} işlem` : `💀 ${p.kills}`}
                </span>
                <span
                  style={{
                    color: isOffice ? "#0f172a" : "#fbbf24",
                    fontWeight: 800,
                  }}
                >
                  {isOffice ? `${p.score}p` : `⭐ ${p.score}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Hint (Bottom Right) */}
      <div
        style={{
          ...styles.controlsHint,
          backgroundColor: panelBg,
          border: panelBorder,
          color: panelText,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <Compass size={13} color={isOffice ? "#2563eb" : "#fbbf24"} />
          <span
            style={{
              fontWeight: 800,
              fontSize: "11px",
              color: isOffice ? "#64748b" : "#a8a29e",
            }}
          >
            {isOffice ? "KISAYOLLAR" : "SAVAŞ KONTROLLERİ"}
          </span>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: isOffice ? "#475569" : "#d6d3d1",
            lineHeight: 1.5,
          }}
        >
          <div>
            <kbd style={styles.kbd}>W A S D</kbd> / <kbd style={styles.kbd}>Oklar</kbd> : Hareket
          </div>
          <div style={{ marginTop: "3px" }}>
            <kbd style={styles.kbd}>Sol Tık</kbd> / <kbd style={styles.kbd}>Boşluk</kbd> : Ateş Et
          </div>
          <div style={{ marginTop: "3px" }}>
            <kbd style={styles.kbd}>Shift + O</kbd> : Ofis / Eğlence Modu
          </div>
        </div>
      </div>

      {/* Chat Box (Bottom Left) */}
      <div
        style={{
          ...styles.chatContainer,
          backgroundColor: panelBg,
          border: panelBorder,
          color: panelText,
        }}
      >
        <div
          style={{
            ...styles.chatHeader,
            backgroundColor: isOffice ? "#f8fafc" : "#292524",
            borderBottom: isOffice ? "1px solid #e2e8f0" : "1px solid #44403c",
            color: panelText,
          }}
          onClick={() => setShowChat(!showChat)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquare size={14} color={isOffice ? "#2563eb" : "#fbbf24"} />
            <span style={{ fontSize: "12px", fontWeight: 700 }}>
              {isOffice ? "Ekip Notları" : "Takım & Oda Sohbeti"}
            </span>
          </div>
          <span style={{ fontSize: "10px", color: "#64748b" }}>{showChat ? "Gizle" : "Aç"}</span>
        </div>

        {showChat && (
          <>
            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={{ color: "#64748b", fontSize: "11px", fontStyle: "italic" }}>
                  {isOffice ? "Henüz not eklenmedi." : "Arkadaşlarını davet et ve sohbete başla!"}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={styles.chatMessageItem}>
                  <span
                    style={{
                      color: isOffice ? "#2563eb" : m.color,
                      fontWeight: 700,
                      marginRight: "6px",
                    }}
                  >
                    {m.name}:
                  </span>
                  <span
                    style={{
                      color: m.isSystem
                        ? isOffice
                          ? "#475569"
                          : "#fde047"
                        : panelText,
                    }}
                  >
                    {m.text}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendChat}
              style={{
                ...styles.chatForm,
                borderTop: isOffice ? "1px solid #e2e8f0" : "1px solid #292524",
              }}
            >
              <input
                type="text"
                placeholder={isOffice ? "Not ekle..." : "Mesaj yaz..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={80}
                style={{
                  ...styles.chatInput,
                  backgroundColor: isOffice ? "#f8fafc" : "#292524",
                  border: isOffice ? "1px solid #cbd5e1" : "1px solid #44403c",
                  color: panelText,
                }}
              />
              <button
                type="submit"
                style={{
                  ...styles.chatSendBtn,
                  backgroundColor: isOffice ? "#2563eb" : "#f05232",
                }}
              >
                <Send size={13} color="#ffffff" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  deadModal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    border: "2px solid #ef4444",
    borderRadius: "16px",
    padding: "24px 36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 0 40px rgba(239, 68, 68, 0.5)",
    zIndex: 50,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  portalHomeBtn: {
    pointerEvents: "auto",
    backgroundColor: "#f05232",
    color: "#ffffff",
    border: "none",
    borderBottom: "3px solid #c93b1e",
    borderRadius: "10px",
    padding: "7px 14px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  badge: {
    pointerEvents: "auto",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #44403c",
    borderRadius: "10px",
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#fafaf9",
    fontSize: "13px",
  },
  modeToggleBtn: {
    pointerEvents: "auto",
    border: "1px solid",
    borderRadius: "10px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  switchTag: {
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    padding: "2px 6px",
    borderRadius: "6px",
    fontSize: "10px",
  },
  inviteBtn: {
    pointerEvents: "auto",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #57534e",
    borderRadius: "10px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#f5f5f4",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  divider: {
    color: "#57534e",
    fontSize: "12px",
  },
  myStats: {
    pointerEvents: "auto",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #44403c",
    borderRadius: "10px",
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    color: "#fafaf9",
    fontSize: "13px",
  },
  hpBarWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  hpBarOuter: {
    width: "80px",
    height: "8px",
    backgroundColor: "#292524",
    borderRadius: "4px",
    overflow: "hidden",
    border: "1px solid #44403c",
  },
  hpBarInner: {
    height: "100%",
    transition: "width 0.15s ease",
  },
  killFeedContainer: {
    position: "absolute",
    top: "64px",
    left: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  killFeedItem: {
    backgroundColor: "rgba(28, 25, 23, 0.88)",
    borderLeft: "3px solid #f05232",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
  },
  leaderboard: {
    pointerEvents: "auto",
    position: "absolute",
    top: "64px",
    right: "14px",
    width: "230px",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #44403c",
    borderRadius: "12px",
    padding: "12px",
    color: "#fafaf9",
  },
  leaderboardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderBottom: "1px solid #292524",
    paddingBottom: "8px",
    marginBottom: "8px",
  },
  leaderboardList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  leaderboardItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  controlsHint: {
    pointerEvents: "auto",
    position: "absolute",
    bottom: "14px",
    right: "14px",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #44403c",
    borderRadius: "12px",
    padding: "10px 14px",
    color: "#fafaf9",
  },
  kbd: {
    backgroundColor: "#292524",
    border: "1px solid #57534e",
    borderRadius: "4px",
    padding: "1px 5px",
    fontSize: "10px",
    color: "#fbbf24",
    fontWeight: 700,
  },
  chatContainer: {
    pointerEvents: "auto",
    width: "300px",
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    border: "1px solid #44403c",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatHeader: {
    padding: "8px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    backgroundColor: "#292524",
    borderBottom: "1px solid #44403c",
    color: "#fafaf9",
  },
  chatMessages: {
    height: "125px",
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
  },
  chatMessageItem: {
    wordBreak: "break-word",
  },
  chatForm: {
    display: "flex",
    padding: "6px",
    gap: "6px",
    borderTop: "1px solid #292524",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#292524",
    border: "1px solid #44403c",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "12px",
    color: "#fafaf9",
    outline: "none",
    fontFamily: "inherit",
  },
  chatSendBtn: {
    backgroundColor: "#f05232",
    border: "none",
    borderRadius: "6px",
    width: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};
