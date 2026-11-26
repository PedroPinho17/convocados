"use client";

import { useEffect, useState } from "react";
import type { GameDetailDto, RatingDto, UserDto } from "@convocados/shared";
import { ApiError, listMyRatings, upsertRating } from "@/lib/api";
import { Card, CardTitle, Notice, cn } from "@/components/ui";

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
    <Card>
      <CardTitle>Avaliar jogadores (1–5)</CardTitle>
      <p className="-mt-2 mb-4 text-sm text-muted">
        Ajuda a equilibrar as equipas. Só tu vês as notas que dás, e podes mudá-las quando quiseres.
      </p>
      <ul className="flex flex-col divide-y divide-line">
        {others.map((p) => {
          const current = scoreByUser.get(p.userId);
          return (
            <li key={p.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="font-medium">{p.userName}</span>
              <div className="flex gap-1" role="group" aria-label={`Nota para ${p.userName}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={pending}
                    aria-pressed={current === n}
                    onClick={() => rate(p.userId, n)}
                    className={cn(
                      "grid size-10 place-items-center rounded-lg border text-sm font-semibold transition disabled:opacity-50",
                      current === n
                        ? "border-brand bg-brand text-brand-ink"
                        : "border-line bg-surface hover:border-brand/60",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <div className="mt-3">
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        </div>
      ) : null}
    </Card>
  );
}
