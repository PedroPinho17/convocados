import { io, type Socket } from "socket.io-client";
import type { GameDetailDto } from "@convocados/shared";
import { getToken } from "./api";

const API = process.env.EXPO_PUBLIC_API_URL;

let socket: Socket | null = null;

async function getSocket(): Promise<Socket> {
  if (!API) throw new Error("EXPO_PUBLIC_API_URL não está definido");
  const token = await getToken();
  if (!token) throw new Error("Sem sessão");

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(API, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

/** Ao sair da conta: a ligação foi aberta com o token antigo. */
export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}

export async function subscribeGame(
  gameId: string,
  onUpdate: (detail: GameDetailDto) => void,
): Promise<() => void> {
  const s = await getSocket();

  // Também ao religar (rede caiu, app voltou do fundo): o servidor esquece as salas.
  const onConnect = () => {
    s.emit("joinGame", gameId);
  };

  s.on("gameUpdated", onUpdate);
  s.on("connect", onConnect);
  if (s.connected) onConnect();

  return () => {
    s.off("gameUpdated", onUpdate);
    s.off("connect", onConnect);
    s.emit("leaveGame", gameId);
  };
}
