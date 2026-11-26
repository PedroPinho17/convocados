"use client";

import { useState } from "react";
import type { GameDetailDto } from "@convocados/shared";
import { ApiError, cancelGame } from "@/lib/api";
import { Button, Card, Notice } from "@/components/ui";

type Props = {
  game: GameDetailDto;
  onChange: (game: GameDetailDto) => void;
};

/** Só para o organizador: cancela o jogo e avisa quem estava confirmado ou em espera. */
export function CancelGame({ game, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const people = game.participations.length;

  async function onCancel() {
    const warning =
      people > 0
        ? `Cancelar "${game.title}"? ${people === 1 ? "A pessoa inscrita vai" : `As ${people} pessoas inscritas vão`} receber uma notificação.`
        : `Cancelar "${game.title}"?`;
    if (!window.confirm(warning)) return;
    setError(null);
    setPending(true);
    try {
      onChange(await cancelGame(game.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cancelar o jogo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-danger/30">
      <h2 className="text-base font-semibold">Zona de perigo</h2>
      <p className="mt-1 text-sm text-muted">
        Cancela o jogo (ex.: chuva). Quem está inscrito recebe uma notificação.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Button variant="danger" onClick={() => void onCancel()} disabled={pending} className="self-start">
          {pending ? "A cancelar…" : "Cancelar jogo"}
        </Button>
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
      </div>
    </Card>
  );
}
