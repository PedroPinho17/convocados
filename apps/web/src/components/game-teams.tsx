"use client";

import { useState } from "react";
import {
  PREFERRED_POSITION_LABELS,
  type GameDetailDto,
  type PreferredPosition,
  type UserDto,
} from "@convocados/shared";
import { ApiError, generateTeams } from "@/lib/api";
import { Button, Card, CardTitle, Notice, cn } from "@/components/ui";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
  onChange: (game: GameDetailDto) => void;
};

/** Cores das equipas (A, B, C, D), para se distinguirem à primeira vista. */
const TEAM_COLORS = ["bg-brand", "bg-sky-500", "bg-amber-500", "bg-fuchsia-500"];

const positionLabel = (pos: PreferredPosition | null) =>
  pos && pos !== "ANY" ? PREFERRED_POSITION_LABELS[pos] : null;

/**
 * Equipas equilibradas pelo organizador. Todos veem as mesmas (chegam pelo socket).
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

  async function generate(again: boolean) {
    setError(null);
    setPending(true);
    try {
      onChange(
        await generateTeams(game.id, {
          teamCount: 2,
          seed: again ? Date.now() : undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fazer as equipas.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardTitle
        aside={
          isOrganizer ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending || !canGenerate}
                onClick={() => void generate(false)}
              >
                {pending ? "A gerar…" : "Gerar equipas equilibradas"}
              </Button>
              {hasTeams ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending || !canGenerate}
                  onClick={() => void generate(true)}
                >
                  Gerar outra vez
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        Equipas
      </CardTitle>
      <div className="flex flex-col gap-3">
        {isOrganizer && !canGenerate ? (
          <p className="text-sm text-muted">Precisas de pelo menos 2 confirmados.</p>
        ) : null}
        {isOrganizer && !hasTeams && canGenerate ? (
          <p className="text-sm text-muted">
            Equilibradas pela força (avaliações com prior) e pela posição preferida. Todos veem as
            equipas que guardares.
          </p>
        ) : null}
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
        {hasTeams && game.teamsBalance ? (
          <p className="text-sm text-muted">{game.teamsBalance.explanation}.</p>
        ) : null}
        {hasTeams ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {game.teams.map((team, i) => (
              <div key={team.name} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 shrink-0 rounded-full",
                      TEAM_COLORS[i % TEAM_COLORS.length],
                    )}
                  />
                  Equipa {team.name}{" "}
                  <span className="whitespace-nowrap text-sm font-normal text-muted">
                    · {team.players.length}{" "}
                    {team.players.length === 1 ? "jogador" : "jogadores"} · força{" "}
                    {team.totalStrength.toFixed(1)}
                  </span>
                </p>
                <ol className="mt-2 flex flex-col gap-1 text-sm">
                  {team.players.map((p) => {
                    const pos = positionLabel(p.preferredPosition);
                    return (
                      <li key={p.userId} className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>
                          {p.name}
                          {pos ? <span className="text-muted"> · {pos}</span> : null}
                        </span>
                        <span className="tabular-nums text-muted">{p.strength.toFixed(1)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        ) : null}
        {hasTeams && withoutTeam.length > 0 ? (
          <Notice tone="warn">
            Sem equipa: {withoutTeam.map((p) => p.userName).join(", ")}.
            {isOrganizer ? " Gera outra vez para os incluir." : ""}
          </Notice>
        ) : null}
      </div>
    </Card>
  );
}
