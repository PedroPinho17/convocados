"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  formatEuros,
  sportLabel,
  type GameDetailDto,
  type GameInviteDto,
  type UserDto,
} from "@convocados/shared";
import { ApiError, getGameDetail, getInvite, getMe } from "@/lib/api";
import { GameParticipation } from "@/components/game-participation";
import { InvitePreview } from "@/components/invite-preview";
import { subscribeGame } from "@/lib/socket";
import { GameRatings } from "@/components/game-ratings";
import { GameTeams } from "@/components/game-teams";
import { AppHeader, Badge, Notice, Page, navLinkClass } from "@/components/ui";
import { formatGameDate } from "@/lib/format";
import Link from "next/link";

/**
 * Página do convite (/i/<código>).
 * - Sem sessão: o resumo público do jogo (sem pagamentos) e "Entra ou cria conta".
 * - Com sessão: o detalhe completo, pedido com o código do convite (é ele que dá acesso
 *   a quem ainda não está no jogo), para confirmar, desistir e ver tudo em tempo real.
 */
export function InviteClient() {
  const { code } = useParams<{ code: string }>();
  const [invite, setInvite] = useState<GameInviteDto | null>(null);
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [loaded, setLoaded] = useState(false);
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
      .then(async ([preview, user]) => {
        const detail = user ? await getGameDetail(preview.id, code) : null;
        if (cancelled) return;
        setInvite(preview);
        setMe(user);
        setGame(detail);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Erro ao abrir o convite.");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!game?.id || !me || !code) return;
    return subscribeGame(
      game.id,
      (detail) => {
        if (detail.id === game.id) setGame(detail);
      },
      code,
    );
  }, [game?.id, me, code]);

  const header = (
    <AppHeader>
      {me ? (
        <Link href="/games" className={navLinkClass}>
          Os meus jogos
        </Link>
      ) : null}
    </AppHeader>
  );

  if (error || !loaded || !invite) {
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

  const summary = game ?? invite;

  return (
    <>
      {header}
      <Page>
        <section className="flex flex-col gap-2 rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-ink/5 sm:p-7">
          <p className="text-sm font-semibold text-brand-strong">Foste convocado</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {summary.title}
          </h1>
          <p className="text-base font-medium text-ink">{formatGameDate(summary.startsAt)}</p>
          <p className="mt-1">
            <Badge tone="brand">{sportLabel(summary.sport)}</Badge>
          </p>
          <p className="text-sm text-muted">
            {summary.location} · total {formatEuros(summary.totalPriceCents)}
          </p>
          {summary.status === "cancelled" ? (
            <p role="status" className="mt-2 rounded-xl bg-danger-soft px-4 py-3 text-danger">
              Este jogo foi cancelado pelo organizador.
            </p>
          ) : null}
        </section>
        {me ? <p className="text-sm text-muted">Olá, {me.name}.</p> : null}
        {game && me ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <GameParticipation
              game={game}
              me={me}
              loginNext={`/i/${code}`}
              inviteCode={code}
              onChange={setGame}
            />
            <div className="flex flex-col gap-6">
              <GameTeams game={game} me={me} onChange={setGame} />
              <GameRatings game={game} me={me} />
            </div>
          </div>
        ) : (
          <InvitePreview invite={invite} loginNext={`/i/${code}`} />
        )}
      </Page>
    </>
  );
}
