"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameDetailDto, UserDto } from "@convocados/shared";
import { ApiError, confirmGame, leaveGame } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
  /** Para onde voltar depois do login (só usado sem sessão). */
  loginNext: string;
  onChange: (game: GameDetailDto) => void;
};

/** Vagas, preço por pessoa, confirmar/desistir e as listas. Usado no convite e no detalhe do jogo. */
export function GameParticipation({ game, me, loginNext, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Hora fixada ao abrir a página (o render tem de ser puro); a API valida de novo ao confirmar.
  const [openedAt] = useState(() => Date.now());

  const confirmed = game.participations.filter((p) => p.status === "confirmed");
  const waiting = game.participations.filter((p) => p.status === "waiting");
  const mine = me ? game.participations.find((p) => p.userId === me.id) : undefined;
  const myQueuePlace = mine?.status === "waiting" ? waiting.findIndex((p) => p.id === mine.id) + 1 : 0;
  const slotsFull = game.confirmedCount >= game.slots;
  const full = slotsFull && game.waitingCount >= game.subs;
  const started = new Date(game.startsAt).getTime() <= openedAt;

  async function run(action: (id: string) => Promise<GameDetailDto>, fallback: string) {
    setError(null);
    setPending(true);
    try {
      onChange(await action(game.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p>
          <strong>
            {game.confirmedCount}/{game.slots}
          </strong>{" "}
          confirmados
          {game.subs > 0 ? ` · ${game.waitingCount}/${game.subs} em lista de espera` : null}
        </p>
        <p className="text-zinc-600">
          <PriceRangeText {...game} confirmedCount={game.confirmedCount} />
        </p>
      </div>

      {!me ? (
        <p>
          <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="underline">
            Entra ou cria conta
          </Link>{" "}
          para confirmar presença.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {mine ? (
            <p className="text-sm">
              {mine.status === "confirmed" ? (
                <>Estás <strong>confirmado</strong>.</>
              ) : (
                <>
                  Estás em <strong>lista de espera</strong> ({myQueuePlace}.º). Entras se alguém desistir.
                </>
              )}
            </p>
          ) : null}
          <div className="flex gap-2">
            {!mine ? (
              <button
                type="button"
                disabled={pending || full || started}
                onClick={() => run(confirmGame, "Não foi possível confirmar.")}
                className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
              >
                {started ? "Jogo já começou" : full ? "Jogo cheio" : slotsFull ? "Entrar na lista de espera" : "Confirmar"}
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(leaveGame, "Não foi possível desistir.")}
                className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50"
              >
                Desistir
              </button>
            )}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Confirmados</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-zinc-500">Ainda ninguém.</p>
        ) : (
          <ol className="list-decimal pl-5">
            {confirmed.map((p) => (
              <li key={p.id}>{p.userName}</li>
            ))}
          </ol>
        )}
      </div>

      {game.subs > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">Lista de espera</h2>
          {waiting.length === 0 ? (
            <p className="text-sm text-zinc-500">Vazia.</p>
          ) : (
            <ol className="list-decimal pl-5">
              {waiting.map((p) => (
                <li key={p.id}>{p.userName}</li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}
