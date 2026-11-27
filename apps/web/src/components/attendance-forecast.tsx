"use client";

import { useEffect, useState } from "react";
import type { AttendanceForecastDto, UserDto } from "@convocados/shared";
import { ApiError, getAttendanceForecast } from "@/lib/api";
import { Card, CardTitle, Notice } from "@/components/ui";

type Props = {
  gameId: string;
  me: UserDto | null;
  organizerId: string;
  cancelled: boolean;
};

/** Cartão pequeno: previsão de comparecimento (só organizador). */
export function AttendanceForecast({ gameId, me, organizerId, cancelled }: Props) {
  const [data, setData] = useState<AttendanceForecastDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOrganizer = me?.id === organizerId;

  useEffect(() => {
    if (!isOrganizer || cancelled) return;
    getAttendanceForecast(gameId)
      .then(setData)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro na previsão.");
      });
  }, [gameId, isOrganizer, cancelled]);

  if (!isOrganizer || cancelled) return null;

  return (
    <Card>
      <CardTitle>Previsão de comparecimento</CardTitle>
      {error ? (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      ) : !data ? (
        <p className="text-sm text-muted">A calcular…</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Esperados{" "}
            <strong>
              {data.expectedPlayers.toLocaleString("pt-PT", {
                maximumFractionDigits: 1,
              })}
            </strong>{" "}
            de {data.neededPlayers} vagas.
          </p>
          {data.riskOfNotFilling ? (
            <Notice tone="warn">Risco de não encher o jogo.</Notice>
          ) : (
            <Notice tone="ok">Deve encher, segundo o histórico.</Notice>
          )}
          <ul className="flex flex-col gap-1">
            {data.players.map((p) => (
              <li key={p.userId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="tabular-nums text-muted">
                  {Math.round(p.probability * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
