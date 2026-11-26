"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEuros, type CreateGameInput, type GameDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, getGameDetail, getMe, updateGame } from "@/lib/api";
import { subscribeGame } from "@/lib/socket";
import { formatGameDate } from "@/lib/format";
import { GameForm } from "@/components/game-form";
import { GameParticipation } from "@/components/game-participation";
import { InviteShare } from "@/components/invite-share";
import { CancelGame } from "@/components/cancel-game";
import { GameRatings } from "@/components/game-ratings";
import { GameTeams } from "@/components/game-teams";
import { AppHeader, Badge, Button, Card, CardTitle, Notice, Page, navLinkClass } from "@/components/ui";

export function GameDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getGameDetail(id), getMe()])
      .then(([g, user]) => {
        setGame(g);
        setMe(user);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/games/${id}`)}`);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    return subscribeGame(id, (detail) => {
      if (detail.id === id) setGame(detail);
    });
  }, [id]);

  const header = (
    <AppHeader>
      <Link href="/games" className={navLinkClass}>
        Jogos
      </Link>
      <Link href="/account" className={navLinkClass}>
        Conta
      </Link>
    </AppHeader>
  );

  if (error) {
    return (
      <>
        {header}
        <Page>
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        </Page>
      </>
    );
  }
  if (!game) {
    return (
      <>
        {header}
        <Page>
          <p className="text-muted">A carregar…</p>
        </Page>
      </>
    );
  }

  const isOrganizer = me?.id === game.organizerId;
  const cancelled = game.status === "cancelled";

  async function onSave(input: CreateGameInput) {
    await updateGame(id, input);
    // Mudar vagas pode promover quem está em espera: recarregar as listas.
    setGame(await getGameDetail(id));
    setEditing(false);
  }

  return (
    <>
      {header}
      <Page>
        <Link href="/games" className="text-sm font-medium text-muted hover:text-ink">
          ← Voltar
        </Link>

        {editing ? (
          <Card className="mx-auto w-full max-w-2xl">
            <CardTitle>
              <span>Editar jogo</span>
            </CardTitle>
            <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
          </Card>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.title}</h1>
                    {cancelled ? <Badge tone="danger">Cancelado</Badge> : null}
                  </div>
                  <p className="mt-2 text-base font-medium text-brand-strong">{formatGameDate(game.startsAt)}</p>
                </div>
                {isOrganizer && !cancelled && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                )}
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted">Local</dt>
                  <dd className="font-medium">{game.location}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Total</dt>
                  <dd className="font-medium">{formatEuros(game.totalPriceCents)}</dd>
                </div>
              </dl>
              {cancelled ? (
                <p role="status" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
                  Este jogo foi cancelado pelo organizador.
                </p>
              ) : null}
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <GameParticipation game={game} me={me} loginNext={`/games/${id}`} onChange={setGame} />
              <div className="flex flex-col gap-6">
                {isOrganizer && !cancelled ? <InviteShare inviteCode={game.inviteCode} /> : null}
                {!cancelled ? <GameTeams game={game} me={me} onChange={setGame} /> : null}
                {!cancelled ? <GameRatings game={game} me={me} /> : null}
                {isOrganizer && game.status === "open" ? <CancelGame game={game} onChange={setGame} /> : null}
              </div>
            </div>
          </>
        )}
      </Page>
    </>
  );
}
