import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { joinGameRoom, JoinOptions } from "./network/client";
import { AuthUser, fetchCurrentUser, clearToken } from "./network/authClient";
import { createPhaserGame, createSoloPhaserGame } from "./game/main";
import { HUD } from "./ui/HUD";
import { SoloHUD } from "./ui/SoloHUD";
import { LoginScreen } from "./ui/LoginScreen";
import { AuthScreen } from "./ui/AuthScreen";
import { PortalHome } from "./portal/PortalHome";

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  const hasInviteRoom = (() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    return Boolean(codeFromUrl && /^[a-zA-Z0-9_-]{1,24}$/.test(codeFromUrl));
  })();

  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    hasInviteRoom ? "survival-arena-2d" : null
  );
  const [playMode, setPlayMode] = useState<"solo" | "multiplayer">(
    hasInviteRoom ? "multiplayer" : "solo"
  );
  const [soloDifficulty, setSoloDifficulty] = useState<"medium" | "hard">("medium");

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  // Silently restore saved session in the background
  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((session) => {
      if (!active) return;
      if (session) {
        setUser(session.user);
        setToken(session.token);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const destroyPhaser = () => {
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
  };

  const handleAuthenticated = (authUser: AuthUser, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    setShowAuthScreen(false);
  };

  const handleLogout = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    destroyPhaser();
    clearToken();
    setUser(null);
    setToken(null);
    setSelectedGameId(null);
    setShowAuthScreen(false);
  };

  const handleSelectGame = (
    gameId: string,
    mode: "solo" | "multiplayer",
    difficulty: "medium" | "hard" = "medium"
  ) => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    destroyPhaser();
    setError(null);
    setSoloDifficulty(difficulty);
    setPlayMode(mode);
    setSelectedGameId(gameId);
  };

  const handleJoin = async (options: JoinOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const activeRoom = await joinGameRoom(options);
      setRoom(activeRoom);
    } catch (err: any) {
      console.error("Connection error:", err);
      const msg = String(err?.message || "");
      if (msg.includes("not found")) {
        setError("Girilen oda kodu bulunamadı. Kodun doğru olduğundan emin olun.");
      } else if (msg.includes("giriş")) {
        setError("Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.");
      } else {
        setError(
          "Sunucuya bağlanılamadı. Sunucu uyanıyor olabilir, birkaç saniye sonra tekrar deneyin."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPortal = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    destroyPhaser();
    setError(null);
    setSelectedGameId(null);
    setShowAuthScreen(false);
  };

  // Mount Solo Phaser Scene
  useEffect(() => {
    if (selectedGameId && playMode === "solo" && phaserContainerRef.current && !gameInstanceRef.current) {
      gameInstanceRef.current = createSoloPhaserGame(phaserContainerRef.current, soloDifficulty);
    }
    return () => {
      if (playMode === "solo") {
        destroyPhaser();
      }
    };
  }, [selectedGameId, playMode, soloDifficulty]);

  // Mount Multiplayer Phaser Scene
  useEffect(() => {
    if (playMode === "multiplayer" && room && phaserContainerRef.current && !gameInstanceRef.current) {
      gameInstanceRef.current = createPhaserGame(phaserContainerRef.current, room);

      room.onLeave((code) => {
        console.log("Disconnected from room with code:", code);
        setRoom(null);
        destroyPhaser();
      });
    }

    return () => {
      if (playMode === "multiplayer") {
        destroyPhaser();
      }
    };
  }, [room, playMode]);

  // Explicit Auth Screen opened from Navbar
  if (showAuthScreen && (!user || !token)) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        onBackToPortal={() => setShowAuthScreen(false)}
      />
    );
  }

  // 1. Landing Page: Always show games first!
  if (!selectedGameId) {
    return (
      <PortalHome
        user={user}
        onSelectGame={handleSelectGame}
        onOpenAuth={() => setShowAuthScreen(true)}
        onLogout={handleLogout}
      />
    );
  }

  // 2. Solo Mode (Instant, zero login required!)
  if (playMode === "solo") {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <div
          ref={phaserContainerRef}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        />
        <SoloHUD
          onBackToPortal={handleBackToPortal}
          onSwitchToMultiplayer={() => handleSelectGame(selectedGameId, "multiplayer")}
        />
      </div>
    );
  }

  // 3. Multiplayer Mode: Requires login/registration
  if (!user || !token) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        onBackToPortal={handleBackToPortal}
        reasonText="Çok oyunculu moda katılmak için hesabınla giriş yap. (Tek kişilik mod girişsiz oynanabilir.)"
      />
    );
  }

  // 4. Multiplayer Lobby & Game
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!room ? (
        <LoginScreen
          user={user}
          token={token}
          onJoin={handleJoin}
          isLoading={isLoading}
          error={error}
          onBackToPortal={handleBackToPortal}
        />
      ) : (
        <>
          <div
            ref={phaserContainerRef}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          />
          <HUD room={room} onBackToPortal={handleBackToPortal} />
        </>
      )}
    </div>
  );
};

export default App;
