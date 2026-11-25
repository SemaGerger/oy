import { Client, Room } from "colyseus.js";

const envServerUrl = ((import.meta as any).env?.VITE_SERVER_URL as string | undefined)?.trim();

const SERVER_URL = envServerUrl
  ? envServerUrl.replace(/\/+$/, "").replace(/^http:/i, "ws:").replace(/^https:/i, "wss:")
  : window.location.protocol === "https:"
    ? `wss://${window.location.hostname}:2567`
    : `ws://${window.location.hostname}:2567`;

export const colyseusClient = new Client(SERVER_URL);

let activeRoom: Room | null = null;

export interface JoinOptions {
  token: string;
  gameMode: "coop" | "pvp";
  roomCode?: string;
  createNew?: boolean;
}

export const joinGameRoom = async (options: JoinOptions): Promise<Room> => {
  if (activeRoom) {
    activeRoom.leave();
  }

  const { token, gameMode, roomCode, createNew } = options;

  if (roomCode && roomCode.trim() !== "") {
    activeRoom = await colyseusClient.joinById(roomCode.trim(), {
      token,
      gameMode,
    });
  } else if (createNew) {
    activeRoom = await colyseusClient.create("game_room", {
      token,
      gameMode,
    });
  } else {
    activeRoom = await colyseusClient.joinOrCreate("game_room", {
      token,
      gameMode,
    });
  }

  return activeRoom;
};

export const getActiveRoom = (): Room | null => activeRoom;
