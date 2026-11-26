import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { joinGameRoom, JoinOptions } from "./network/client";
import { AuthUser, fetchCurrentUser, clearToken } from "./network/authClient";
import { createPhaserGame } from "./game/main";
import { HUD } from "./ui/HUD";
import { LoginScreen } from "./ui/LoginScreen";
import { AuthScreen } from "./ui/AuthScreen";
import { PortalHome } from "./portal/PortalHome";
import { GAMES_REGISTRY } from "./portal/gamesRegistry";

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl && /^[a-zA-Z0-9_-]{1,24}$/.test(codeFromUrl)) {
      return "survival-arena-2d";
    }
    return null;
  });

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  // Silently restore saved session in the background without blocking landing page
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
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
    clearToken();
    setUser(null);
    setToken(null);
    setSelectedGameId(null);
    setShowAuthScreen(false);
  };

  const handleSelectGame = (gameId: string) => {
    setError(null);
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
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
    setError(null);
    setSelectedGameId(null);
    setShowAuthScreen(false);
  };

  useEffect(() => {
    if (room && phaserContainerRef.current && !gameInstanceRef.current) {
      gameInstanceRef.current = createPhaserGame(phaserContainerRef.current, room);

      room.onLeave((code) => {
        console.log("Disconnected from room with code:", code);
        setRoom(null);
        if (gameInstanceRef.current) {
          gameInstanceRef.current.destroy(true);
          gameInstanceRef.current = null;
        }
      });
    }

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [room]);

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

  // 2. Check if selected game requires authentication (Multiplayer games)
  const selectedGame = GAMES_REGISTRY.find((g) => g.id === selectedGameId);
  if (selectedGame?.requiresAuth && (!user || !token)) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        onBackToPortal={handleBackToPortal}
        reasonText={`${selectedGame.title} çok oyunculu bir oyundur. Oynamak için giriş yapın.`}
      />
    );
  }

  // 3. Game #1: Survival Arena 2D
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!room ? (
        <LoginScreen
          user={user!}
          token={token!}
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
