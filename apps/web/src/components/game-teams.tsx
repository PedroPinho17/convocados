"use client";

import { useState } from "react";
import type { GameDetailDto, UserDto } from "@convocados/shared";
import { ApiError, generateTeams } from "@/lib/api";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
  onChange: (game: GameDetailDto) => void;
};

/**
 * Equipas guardadas pelo organizador. Todos veem as mesmas (chegam pelo socket).
 * Sem avaliações à vista: são privadas de quem as deu.
 */
export function GameTeams({ game, me, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isOrganizer = me?.id === game.organizerId;
  const hasTeams = game.teams.length > 0;
  const inTeams = new Set(game.teams.flatMap((t) => t.players.map((p) => p.userId)));
  const withoutTeam = game.participations.filter(
    (p) => p.status === "confirmed" && !inTeams.has(p.userId),
  );
  const canGenerate = game.confirmedCount >= 2;

  if (!hasTeams && !isOrganizer) return null;

  async function generate() {
    setError(null);
    setPending(true);
    try {
      onChange(await generateTeams(game.id, { teamCount: 2 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fazer as equipas.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Equipas</h2>
        {isOrganizer ? (
          <button
            type="button"
            disabled={pending || !canGenerate}
            onClick={() => void generate()}
            className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            {pending ? "A fazer equipas…" : hasTeams ? "Atualizar equipas" : "Fazer equipas"}
          </button>
        ) : null}
      </div>
      {isOrganizer && !canGenerate ? (
        <p className="text-sm text-zinc-500">Precisas de pelo menos 2 confirmados.</p>
      ) : null}
      {isOrganizer && !hasTeams && canGenerate ? (
        <p className="text-sm text-zinc-500">
          Equilibradas pelas avaliações dos jogadores. Todos veem as equipas que guardares.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hasTeams ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {game.teams.map((team) => (
            <div key={team.name} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">
                Equipa {team.name}{" "}
                <span className="text-sm font-normal text-zinc-500">
                  · {team.players.length} jogadores
                </span>
              </p>
              <ol className="mt-2 list-decimal pl-5 text-sm">
                {team.players.map((p) => (
                  <li key={p.userId}>{p.name}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}
      {hasTeams && withoutTeam.length > 0 ? (
        <p className="text-sm text-amber-700">
          Sem equipa: {withoutTeam.map((p) => p.userName).join(", ")}.
          {isOrganizer ? " Atualiza as equipas para os incluir." : ""}
        </p>
      ) : null}
    </section>
  );
}
