"use client";

import { io, type Socket } from "socket.io-client";
import type { GameDetailDto } from "@convocados/shared";

const API = process.env.NEXT_PUBLIC_API_URL;

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL não está definido em apps/web/.env.local");
  if (!socket) {
    socket = io(API, {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}

/** Ao sair da conta: a ligação foi aberta com o cookie da sessão antiga. */
export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeGame(
  gameId: string,
  onUpdate: (detail: GameDetailDto) => void,
): () => void {
  const s = getSocket();

  const onConnect = () => {
    s.emit("joinGame", gameId);
  };

  s.on("gameUpdated", onUpdate);
  s.on("connect", onConnect);

  if (s.connected) {
    s.emit("joinGame", gameId);
  } else {
    s.connect();
  }

  return () => {
    s.off("gameUpdated", onUpdate);
    s.off("connect", onConnect);
    s.emit("leaveGame", gameId);
  };
}