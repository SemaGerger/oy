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
} from "lucide-react";
import { EventBus } from "../game/EventBus";

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
}

export const HUD: React.FC<HUDProps> = ({ room }) => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo>({
    wave: 1,
    gameMode: "coop",
    roomCode: room.roomId,
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

  return (
    <div style={styles.overlay}>
      {/* Respawn Banner when Local Player is Dead */}
      {localPlayer?.isDead && (
        <div style={styles.deadModal}>
          <Skull size={42} color="#ef4444" />
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
            ÖLDÜNÜZ!
          </div>
          <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
            Yeniden doğuluyor... ({Math.max(1, Math.ceil(localPlayer.respawnTimer))} sn)
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={styles.topBar}>
        {/* Left: Wave, Enemy Count, Mode Switcher & Friend Invite */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={styles.badge}>
            <Flame size={16} color="#f97316" />
            <span style={{ fontWeight: 800, color: "#f97316" }}>DALGA {gameInfo.wave}</span>
            <span style={styles.divider}>•</span>
            <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600 }}>
              👾 {gameInfo.enemyCount} Düşman
            </span>
            <span style={styles.divider}>•</span>
            <Users size={14} color="#94a3b8" />
            <span style={{ color: "#94a3b8", fontSize: "12px" }}>{players.length} Oyuncu</span>
          </div>

          {/* Mode Toggle Button */}
          <button
            onClick={handleToggleMode}
            style={{
              ...styles.modeToggleBtn,
              backgroundColor: isPvp ? "rgba(239, 68, 68, 0.85)" : "rgba(34, 197, 94, 0.85)",
              borderColor: isPvp ? "#f87171" : "#4ade80",
            }}
            title="Oyun modunu değiştirmek için tıkla"
          >
            {isPvp ? <Swords size={15} /> : <Shield size={15} />}
            <span>
              {isPvp
                ? "MOD: KAOS / PvP (Arkadaşları Vurma Açık)"
                : "MOD: CO-OP (Birlikte Düşmanlara Karşı)"}
            </span>
            <span style={styles.switchTag}>Değiştir</span>
          </button>

          {/* Invite Friend Button */}
          <button
            onClick={handleCopyInvite}
            style={styles.inviteBtn}
            title="Arkadaşını bu odaya davet etmek için davet linkini kopyala"
          >
            {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} color="#38bdf8" />}
            <span>
              {copied ? "Davet Linki Kopyalandı!" : `Arkadaş Davet Et (Kod: ${room.roomId})`}
            </span>
          </button>
        </div>

        {/* Right: Local Player HP & Score */}
        {localPlayer && (
          <div style={styles.myStats}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  backgroundColor: localPlayer.color,
                  boxShadow: `0 0 8px ${localPlayer.color}`,
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
      <div style={styles.leaderboard}>
        <div style={styles.leaderboardHeader}>
          <Trophy size={16} color="#facc15" />
          <span style={{ fontWeight: "bold", fontSize: "13px" }}>SKOR & AV TABLOSU</span>
        </div>
        <div style={styles.leaderboardList}>
          {players.slice(0, 8).map((p, index) => (
            <div
              key={p.id}
              style={{
                ...styles.leaderboardItem,
                backgroundColor: p.isLocal ? "rgba(56, 189, 248, 0.16)" : "transparent",
                borderLeft: p.isLocal ? "3px solid #38bdf8" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    color: index < 3 ? "#facc15" : "#64748b",
                    fontSize: "12px",
                    width: "16px",
                  }}
                >
                  #{index + 1}
                </span>
                <span
                  style={{
                    color: p.isLocal ? "#38bdf8" : "#f1f5f9",
                    fontSize: "12px",
                    fontWeight: p.isLocal ? "bold" : "normal",
                    textDecoration: p.isDead ? "line-through" : "none",
                  }}
                >
                  {p.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                <span style={{ color: "#f87171" }} title="Öldürme">
                  💀 {p.kills}
                </span>
                <span style={{ color: "#facc15", fontWeight: "bold" }} title="Skor">
                  ⭐ {p.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Hint (Bottom Right) */}
      <div style={styles.controlsHint}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <Compass size={14} color="#38bdf8" />
          <span style={{ fontWeight: "bold", fontSize: "11px", color: "#94a3b8" }}>
            SAVAŞ KONTROLLERİ
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>
          <div>
            <kbd style={styles.kbd}>W A S D</kbd> / <kbd style={styles.kbd}>Oklar</kbd> : Hareket
          </div>
          <div style={{ marginTop: "3px" }}>
            <kbd style={styles.kbd}>Sol Tık</kbd> veya <kbd style={styles.kbd}>Boşluk</kbd> : Ateş Et
          </div>
          <div style={{ marginTop: "3px", color: "#4ade80" }}>
            💚 Düşmanlardan düşen küreler Can (+8 HP) ve Puan verir!
          </div>
        </div>
      </div>

      {/* Chat Box (Bottom Left) */}
      <div style={styles.chatContainer}>
        <div style={styles.chatHeader} onClick={() => setShowChat(!showChat)}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquare size={15} color="#38bdf8" />
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>Takım & Oda Sohbeti</span>
          </div>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>{showChat ? "Gizle" : "Aç"}</span>
        </div>

        {showChat && (
          <>
            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={{ color: "#64748b", fontSize: "11px", fontStyle: "italic" }}>
                  Arkadaşlarını davet et ve sohbete başla!
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={styles.chatMessageItem}>
                  <span style={{ color: m.color, fontWeight: "bold", marginRight: "6px" }}>
                    {m.name}:
                  </span>
                  <span style={{ color: m.isSystem ? "#fde047" : "#f1f5f9" }}>{m.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} style={styles.chatForm}>
              <input
                type="text"
                placeholder="Mesaj yaz..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={80}
                style={styles.chatInput}
              />
              <button type="submit" style={styles.chatSendBtn}>
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
  badge: {
    pointerEvents: "auto",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#ffffff",
    fontSize: "13px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  modeToggleBtn: {
    pointerEvents: "auto",
    border: "1px solid",
    borderRadius: "12px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  switchTag: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "2px 6px",
    borderRadius: "6px",
    fontSize: "10px",
  },
  inviteBtn: {
    pointerEvents: "auto",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    borderRadius: "12px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#e2e8f0",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  divider: {
    color: "#475569",
    fontSize: "12px",
  },
  myStats: {
    pointerEvents: "auto",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "12px",
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    color: "#ffffff",
    fontSize: "13px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  },
  hpBarWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  hpBarOuter: {
    width: "80px",
    height: "8px",
    backgroundColor: "#1e293b",
    borderRadius: "4px",
    overflow: "hidden",
    border: "1px solid #334155",
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
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderLeft: "3px solid #ef4444",
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
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  },
  leaderboardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "10px 14px",
    color: "#ffffff",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
  },
  kbd: {
    backgroundColor: "#1e293b",
    border: "1px solid #475569",
    borderRadius: "4px",
    padding: "1px 5px",
    fontSize: "10px",
    color: "#38bdf8",
  },
  chatContainer: {
    pointerEvents: "auto",
    width: "300px",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  },
  chatHeader: {
    padding: "8px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#ffffff",
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
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "12px",
    color: "#ffffff",
    outline: "none",
  },
  chatSendBtn: {
    backgroundColor: "#0284c7",
    border: "none",
    borderRadius: "6px",
    width: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};
