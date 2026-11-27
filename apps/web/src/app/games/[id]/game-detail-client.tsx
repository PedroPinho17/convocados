"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEuros, sportLabel, type CreateGameInput, type GameDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, getGameDetail, getMe, listGroups, updateGame } from "@/lib/api";
import { subscribeGame } from "@/lib/socket";
import { formatGameDate } from "@/lib/format";
import { GameForm } from "@/components/game-form";
import { GameParticipation } from "@/components/game-participation";
import { InviteShare } from "@/components/invite-share";
import { CancelGame } from "@/components/cancel-game";
import { GameRatings } from "@/components/game-ratings";
import { GameTeams } from "@/components/game-teams";
import { GameResult } from "@/components/game-result";
import { AttendanceForecast } from "@/components/attendance-forecast";
import { BackLink, Badge, Button, Card, CardTitle, Notice, Page } from "@/components/ui";
import { AppNav } from "@/components/app-nav";

export function GameDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  // Grupos de que sou membro: quem entrou só pelo convite do jogo não pode ir parar ao grupo (403).
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getGameDetail(id), getMe(), listGroups().catch(() => [])])
      .then(([g, user, groups]) => {
        setGame(g);
        setMe(user);
        setMyGroupIds(new Set(groups.map((grp) => grp.id)));
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

  const header = <AppNav />;

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
  const inMyGroup = !!game.groupId && myGroupIds.has(game.groupId);

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
        <BackLink
          href={inMyGroup ? `/groups/${game.groupId}` : "/games"}
          label={inMyGroup ? "Voltar ao grupo" : "Voltar aos jogos"}
        />

        {editing ? (
          <Card className="mx-auto w-full max-w-2xl">
            <CardTitle>
              <span>Editar jogo</span>
            </CardTitle>
            <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
          </Card>
        ) : (
          <>
            <section className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-ink/5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="font-display min-w-0 text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl">
                      {game.title}
                    </h1>
                    {cancelled ? <Badge tone="danger">Cancelado</Badge> : null}
                  </div>
                  <p className="mt-2 text-base font-medium text-brand-strong">{formatGameDate(game.startsAt)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Badge tone="brand">{sportLabel(game.sport)}</Badge>
                    {game.groupName && inMyGroup ? (
                      <Link
                        href={`/groups/${game.groupId}`}
                        className="min-w-0 font-medium text-brand-strong wrap-break-word hover:underline"
                      >
                        {game.groupName}
                      </Link>
                    ) : game.groupName ? (
                      <span className="min-w-0 font-medium wrap-break-word">{game.groupName}</span>
                    ) : null}
                  </p>
                </div>
                {isOrganizer && !cancelled && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex min-w-0 gap-2">
                  <dt className="shrink-0 text-muted">Local</dt>
                  <dd className="min-w-0 font-medium wrap-break-word">
                    {game.location}
                    {game.venueId ? <span className="ml-1 text-xs text-ok">✓</span> : null}
                  </dd>
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

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <GameParticipation game={game} me={me} loginNext={`/games/${id}`} onChange={setGame} />
              <div className="flex flex-col gap-6">
                {isOrganizer && !cancelled ? <InviteShare inviteCode={game.inviteCode} /> : null}
                {!cancelled ? (
                  <AttendanceForecast
                    gameId={game.id}
                    me={me}
                    organizerId={game.organizerId}
                    cancelled={cancelled}
                  />
                ) : null}
                {!cancelled ? <GameTeams game={game} me={me} onChange={setGame} /> : null}
                {!cancelled ? <GameResult game={game} me={me} onChange={setGame} /> : null}
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
