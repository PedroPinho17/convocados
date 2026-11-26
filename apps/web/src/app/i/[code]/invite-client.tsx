"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEuros, type GameDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, getInvite, getMe } from "@/lib/api";
import { GameParticipation } from "@/components/game-participation";

export function InviteClient() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    // O convite é público; a sessão é opcional (sem ela, mostra "Entra ou cria conta").
    Promise.all([
      getInvite(code),
      getMe().catch((err) => {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }),
    ])
      .then(([detail, user]) => {
        if (cancelled) return;
        setGame(detail);
        setMe(user);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Erro ao abrir o convite.");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!game) return <main className="p-8">A carregar…</main>;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <p className="text-sm text-zinc-500">Convite · Convocados</p>
      <h1 className="text-2xl font-semibold">{game.title}</h1>
      <p>
        {game.location} · {new Date(game.startsAt).toLocaleString("pt-PT")} · total{" "}
        {formatEuros(game.totalPriceCents)}
      </p>
      {me ? <p className="text-sm text-zinc-600">Olá, {me.name}.</p> : null}
      <GameParticipation game={game} me={me} loginNext={`/i/${code}`} onChange={setGame} />
    </main>
  );
}
