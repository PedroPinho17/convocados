"use client";

import { io, type Socket } from "socket.io-client";
import type { GameDetailDto } from "@convocados/shared";
import { getSocketToken } from "@/lib/api";

/** O socket liga direto à API (o proxy do Next.js não passa WebSockets). */
const API = process.env.NEXT_PUBLIC_API_URL;

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL não está definido em apps/web/.env.local");
  if (!socket) {
    socket = io(API, {
      autoConnect: true,
      // Em produção a API é outro site: o cookie não chega. A cada ligação (e religação)
      // pede-se um token curto pelo proxy, onde o cookie funciona.
      auth: (cb) => {
        getSocketToken()
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
    });
  }
  return socket;
}

/** Ao sair da conta: a ligação foi aberta com a sessão antiga. */
export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Atualizações do jogo em tempo real. Quem veio pelo link do convite (e ainda não está no
 * jogo) manda o código: sem acesso, a API não o deixa entrar na sala.
 */
export function subscribeGame(
  gameId: string,
  onUpdate: (detail: GameDetailDto) => void,
  inviteCode?: string,
): () => void {
  const s = getSocket();
  const join = () => s.emit("joinGame", inviteCode ? { gameId, inviteCode } : gameId);

  // Também ao religar (rede caiu, separador voltou): o servidor esquece as salas.
  const onConnect = () => {
    join();
  };

  s.on("gameUpdated", onUpdate);
  s.on("connect", onConnect);

  if (s.connected) {
    join();
  } else {
    s.connect();
  }

  return () => {
    s.off("gameUpdated", onUpdate);
    s.off("connect", onConnect);
    s.emit("leaveGame", gameId);
  };
}

/**
 * Depois de sair ou apagar a conta: navegação completa para o login. O Next.js guarda o
 * estado das páginas já visitadas (os jogos, o formulário de login preenchido); uma
 * navegação normal mostrava-os outra vez. Recarregar limpa tudo da memória.
 */
export function leaveToLogin(): void {
  window.location.assign(new URL("/login", window.location.origin).href);
}
