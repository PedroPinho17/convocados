"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateGameInput, GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames, logout } from "@/lib/api";
import { leaveToLogin, resetSocket } from "@/lib/socket";
import { dateParts, formatGameDate } from "@/lib/format";
import { NewGame } from "@/components/new-game";
import { AppHeader, Badge, Card, CardTitle, Notice, Page, navLinkClass } from "@/components/ui";

export default function GamesPage() {
  const router = useRouter();
  // A lista e a hora a que chegou (separa próximos e anteriores). A hora não pode ser lida
  // no primeiro render: o Next.js pré-renderiza a página no build.
  const [loaded, setLoaded] = useState<{ games: GameDto[]; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const games = loaded?.games ?? null;

  const onLoadError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Erro ao carregar jogos.");
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    listGames()
      .then((rows) => {
        if (!cancelled) setLoaded({ games: rows, at: Date.now() });
      })
      .catch(onLoadError);
    return () => {
      cancelled = true;
    };
  }, [onLoadError]);

  async function onCreate(input: CreateGameInput) {
    await createGame(input);
    setLoaded({ games: await listGames(), at: Date.now() });
  }

  async function onLogout() {
    await logout().catch(() => undefined);
    resetSocket();
    leaveToLogin();
  }

  const now = loaded?.at ?? 0;
  const upcoming = (games ?? []).filter((g) => new Date(g.startsAt).getTime() >= now);
  const past = (games ?? []).filter((g) => new Date(g.startsAt).getTime() < now).reverse();

  return (
    <>
      <AppHeader>
        <Link href="/account" className={navLinkClass}>
          Conta
        </Link>
        <button type="button" onClick={onLogout} className={navLinkClass}>
          Sair
        </button>
      </AppHeader>

      <Page>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Os meus jogos</h1>
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="upcoming-title" className="flex flex-col gap-3">
              <h2 id="upcoming-title" className="text-sm font-semibold uppercase tracking-wide text-muted">
                Próximos
              </h2>
              {games === null ? (
                <p className="text-muted">A carregar…</p>
              ) : upcoming.length === 0 ? (
                <Card className="text-center">
                  <p className="font-medium">Ainda não tens jogos.</p>
                  <p className="mt-1 text-sm text-muted">Cria um jogo e partilha o convite no grupo.</p>
                </Card>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {upcoming.map((g) => (
                    <GameCard key={g.id} game={g} />
                  ))}
                </ul>
              )}
            </section>

            {past.length > 0 ? (
              <section aria-labelledby="past-title" className="flex flex-col gap-3">
                <h2 id="past-title" className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Anteriores
                </h2>
                <ul className="grid gap-3 opacity-80 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {past.map((g) => (
                    <GameCard key={g.id} game={g} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <Card className="lg:sticky lg:top-20">
            <CardTitle>Novo jogo</CardTitle>
            <NewGame onCreate={onCreate} />
          </Card>
        </div>
      </Page>
    </>
  );
}

function GameCard({ game }: { game: GameDto }) {
  const { day, month, weekday } = dateParts(game.startsAt);
  const cancelled = game.status === "cancelled";
  return (
    <li className="group relative flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand/50 hover:shadow">
      <div
        aria-hidden="true"
        className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 ${cancelled ? "bg-surface-2 text-muted" : "bg-brand-soft text-brand-strong"}`}
      >
        <span className="text-[0.7rem] font-semibold uppercase">{weekday}</span>
        <span className="text-xl font-bold leading-none">{day}</span>
        <span className="text-[0.7rem] uppercase">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/games/${game.id}`}
            className="truncate font-semibold after:absolute after:inset-0 after:rounded-2xl"
          >
            {game.title}
          </Link>
          {cancelled ? <Badge tone="danger">Cancelado</Badge> : null}
        </div>
        <p className="mt-1 truncate text-sm text-muted">{game.location}</p>
        <p className="mt-0.5 text-sm text-muted">
          {formatGameDate(game.startsAt)} · {game.slots} vagas
        </p>
      </div>
    </li>
  );
}
