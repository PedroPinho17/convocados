"use client";

import { useEffect, useState } from "react";
import type { GameDetailDto, RatingDto, UserDto } from "@convocados/shared";
import { ApiError, listMyRatings, upsertRating } from "@/lib/api";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
};

export function GameRatings({ game, me }: Props) {
  const [mine, setMine] = useState<RatingDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const myParticipation = me
    ? game.participations.find((p) => p.userId === me.id)
    : undefined;
  const canRate = myParticipation?.status === "confirmed";
  const others = game.participations.filter(
    (p) => p.status === "confirmed" && p.userId !== me?.id,
  );

  useEffect(() => {
    // Sem poder avaliar a secção não aparece, por isso não é preciso limpar a lista.
    if (!canRate) return;
    let cancelled = false;
    listMyRatings(game.id)
      .then((rows) => {
        if (!cancelled) setMine(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Erro ao carregar avaliações.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [game.id, canRate]);

  if (!me || !canRate || others.length === 0) return null;

  const scoreByUser = new Map(mine.map((r) => [r.toUserId, r.score]));

  async function rate(toUserId: string, score: number) {
    setError(null);
    setPending(true);
    try {
      const saved = await upsertRating(game.id, { toUserId, score });
      setMine((prev) => {
        const rest = prev.filter((r) => r.toUserId !== toUserId);
        return [...rest, saved];
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Avaliar jogadores (1–5)</h2>
      <p className="text-sm text-zinc-600">
        Ajuda a equilibrar as equipas. Podes alterar a qualquer momento.
      </p>
      <ul className="flex flex-col gap-3">
        {others.map((p) => {
          const current = scoreByUser.get(p.userId);
          return (
            <li key={p.userId} className="flex flex-wrap items-center justify-between gap-2">
              <span>{p.userName}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={pending}
                    onClick={() => rate(p.userId, n)}
                    className={`h-8 w-8 rounded border text-sm disabled:opacity-50 ${
                      current === n
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
