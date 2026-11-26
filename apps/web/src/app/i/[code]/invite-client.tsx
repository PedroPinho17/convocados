"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEuros, sportLabel, type GameDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, getInvite, getMe } from "@/lib/api";
import { GameParticipation } from "@/components/game-participation";
import { subscribeGame } from "@/lib/socket";
import { GameRatings } from "@/components/game-ratings";
import { GameTeams } from "@/components/game-teams";
import { AppHeader, Badge, Notice, Page, navLinkClass } from "@/components/ui";
import { formatGameDate } from "@/lib/format";
import Link from "next/link";

export function InviteClient() {
  const { code } = useParams<{ code: string }>();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    // O convite é público; a sessão é opcional (sem ela, mostra "Entra ou cria conta").
    Promise.all([
      getInvite(code),
      getMe().catch((err) => {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }),
    ])
      .then(([detail, user]) => {
        if (cancelled) return;
        setGame(detail);
        setMe(user);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Erro ao abrir o convite.");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!game?.id || !me) return;
    return subscribeGame(game.id, (detail) => {
      if (detail.id === game.id) setGame(detail);
    });
  }, [game?.id, me]);

  const header = (
    <AppHeader>
      {me ? (
        <Link href="/games" className={navLinkClass}>
          Os meus jogos
        </Link>
      ) : null}
    </AppHeader>
  );

  if (error || !game) {
    return (
      <>
        {header}
        <Page width="narrow">
          {error ? (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          ) : (
            <p className="text-muted">A carregar…</p>
          )}
        </Page>
      </>
    );
  }

  return (
    <>
      {header}
      <Page>
        <section className="flex flex-col gap-2 rounded-2xl bg-brand p-5 text-brand-ink shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Foste convocado</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.title}</h1>
          <p className="text-base font-medium">{formatGameDate(game.startsAt)}</p>
          <p className="mt-1">
            <Badge tone="brand">{sportLabel(game.sport)}</Badge>
          </p>
          <p className="text-sm opacity-90">
            {game.location} · total {formatEuros(game.totalPriceCents)}
          </p>
          {game.status === "cancelled" ? (
            <p role="status" className="mt-2 rounded-xl bg-danger-soft px-4 py-3 text-danger">
              Este jogo foi cancelado pelo organizador.
            </p>
          ) : null}
        </section>
        {me ? <p className="text-sm text-muted">Olá, {me.name}.</p> : null}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <GameParticipation game={game} me={me} loginNext={`/i/${code}`} onChange={setGame} />
          <div className="flex flex-col gap-6">
            <GameTeams game={game} me={me} onChange={setGame} />
            <GameRatings game={game} me={me} />
          </div>
        </div>
      </Page>
    </>
  );
}
