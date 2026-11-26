"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEuros, type CreateGameInput, type GameDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, getGameDetail, getMe, updateGame } from "@/lib/api";
import { subscribeGame } from "@/lib/socket";
import { GameForm } from "@/components/game-form";
import { GameParticipation } from "@/components/game-participation";
import { InviteShare } from "@/components/invite-share";
import { GameRatings } from "@/components/game-ratings";
import { GameTeams } from "@/components/game-teams";

export function GameDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getGameDetail(id), getMe()])
      .then(([g, user]) => {
        setGame(g);
        setMe(user);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/games/${id}`)}`);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    return subscribeGame(id, (detail) => {
      if (detail.id === id) setGame(detail);
    });
  }, [id]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!game) return <main className="p-8">A carregar…</main>;

  const isOrganizer = me?.id === game.organizerId;

  async function onSave(input: CreateGameInput) {
    await updateGame(id, input);
    // Mudar vagas pode promover quem está em espera: recarregar as listas.
    setGame(await getGameDetail(id));
    setEditing(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <Link href="/games" className="text-sm underline">
        ← Voltar
      </Link>

      {editing ? (
        <>
          <h1 className="text-2xl font-semibold">Editar jogo</h1>
          <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">{game.title}</h1>
            {isOrganizer && (
              <button type="button" onClick={() => setEditing(true)} className="rounded border px-3 py-1 text-sm">
                Editar
              </button>
            )}
          </div>
          <p>
            {game.location} · {new Date(game.startsAt).toLocaleString("pt-PT")} · total{" "}
            {formatEuros(game.totalPriceCents)}
          </p>
          {game.status !== "open" ? <p>Estado: {game.status}</p> : null}
          <GameParticipation game={game} me={me} loginNext={`/games/${id}`} onChange={setGame} />
          <GameRatings game={game} me={me} />
          <GameTeams game={game} me={me} onChange={setGame} />
          {isOrganizer ? <InviteShare inviteCode={game.inviteCode} /> : null}
        </>
      )}
    </main>
  );
}
