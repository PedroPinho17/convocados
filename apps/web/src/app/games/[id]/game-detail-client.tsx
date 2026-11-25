"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEuros, type CreateGameInput, type GameDto } from "@convocados/shared";
import { ApiError, getGame, getMe, updateGame } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";
import { GameForm } from "@/components/game-form";

export function GameDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDto | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getGame(id), getMe()])
      .then(([g, me]) => {
        setGame(g);
        setMeId(me.id);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id, router]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!game) return <main className="p-8">A carregar…</main>;

  const isOrganizer = meId === game.organizerId;

  async function onSave(input: CreateGameInput) {
    setGame(await updateGame(id, input));
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
          <p>{game.location}</p>
          <p>{new Date(game.startsAt).toLocaleString("pt-PT")}</p>
          <p>
            {game.slots} vagas · {game.subs} suplentes · total {formatEuros(game.totalPriceCents)}
          </p>
          <p className="text-zinc-600">
            <PriceRangeText {...game} />
          </p>
          <p>
            Código de convite: <strong>{game.inviteCode}</strong>
          </p>
          <p>Estado: {game.status}</p>
        </>
      )}
    </main>
  );
}
