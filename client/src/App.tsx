import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { joinGameRoom, JoinOptions } from "./network/client";
import { createPhaserGame } from "./game/main";
import { HUD } from "./ui/HUD";
import { LoginScreen } from "./ui/LoginScreen";

export const App: React.FC = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  const handleJoin = async (options: JoinOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const activeRoom = await joinGameRoom(options);
      setRoom(activeRoom);
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(
        err?.message?.includes("not found")
          ? "Girilen oda kodu bulunamadı. Kodun doğru olduğundan emin olun."
          : "Sunucuya bağlanılamadı. Lütfen sunucunun (npm run dev) çalıştığından emin olun (port: 2567)."
      );
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!room ? (
        <LoginScreen onJoin={handleJoin} isLoading={isLoading} error={error} />
      ) : (
        <>
          <div
            ref={phaserContainerRef}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          />
          <HUD room={room} />
        </>
      )}
    </div>
  );
};

export default App;
