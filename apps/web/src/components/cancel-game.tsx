"use client";

import { useState } from "react";
import type { GameDetailDto } from "@convocados/shared";
import { ApiError, cancelGame } from "@/lib/api";

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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void onCancel()}
        disabled={pending}
        className="self-start rounded border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50"
      >
        {pending ? "A cancelar…" : "Cancelar jogo"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
