"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateGameInput, GameDto, GroupDto } from "@convocados/shared";
import { ApiError, createGame, listGames, listGroups } from "@/lib/api";
import { NewGame } from "@/components/new-game";
import { GameCard } from "@/components/game-card";
import { AppNav } from "@/components/app-nav";
import { Card, CardTitle, Notice, Page } from "@/components/ui";

export default function GamesPage() {
  const router = useRouter();
  // A lista e a hora a que chegou (separa próximos e anteriores). A hora não pode ser lida
  // no primeiro render: o Next.js pré-renderiza a página no build.
  const [loaded, setLoaded] = useState<{ games: GameDto[]; at: number } | null>(null);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const games = loaded?.games ?? null;

  const onLoadError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?next=%2Fgames");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Erro ao carregar jogos.");
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([listGames(), listGroups()])
      .then(([rows, myGroups]) => {
        if (cancelled) return;
        setLoaded({ games: rows, at: Date.now() });
        setGroups(myGroups);
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

  const now = loaded?.at ?? 0;
  const upcoming = (games ?? []).filter((g) => new Date(g.startsAt).getTime() >= now);
  const past = (games ?? []).filter((g) => new Date(g.startsAt).getTime() < now).reverse();

  return (
    <>
      <AppNav />
      <Page>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Os meus jogos</h1>
        {/* Atalho para os grupos: um cartão claro, não um link de texto perdido no canto. */}
        <Link
          href="/groups"
          className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand/50 hover:shadow"
        >
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-2xl">
            👥
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{groups.length > 0 ? "Os meus grupos" : "Criar um grupo"}</span>
            <span className="block line-clamp-2 text-sm text-muted">
              {groups.length > 0
                ? `${groups.length} ${groups.length === 1 ? "grupo" : "grupos"} · ${groups.map((g) => g.name).join(", ")}`
                : "Para quem joga sempre junto: os jogos do grupo aparecem a todos os membros."}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg text-muted transition group-hover:translate-x-0.5 group-hover:bg-brand-soft group-hover:text-brand-strong"
          >
            →
          </span>
        </Link>
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="upcoming-title" className="flex flex-col gap-3">
              <h2 id="upcoming-title" className="text-sm font-semibold uppercase tracking-wide text-muted">
                Próximos
              </h2>
              {games === null ? (
                <p className="text-muted">A carregar…</p>
              ) : upcoming.length === 0 ? (
                <Card className="text-center">
                  <p className="font-medium">Ainda não tens jogos.</p>
                  <p className="mt-1 text-sm text-muted">
                    Cria um jogo e partilha o convite, ou entra num grupo.
                  </p>
                </Card>
              ) : (
                <ul className="flex flex-col gap-3">
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
                <ul className="flex flex-col gap-3">
                  {past.map((g) => (
                    <GameCard key={g.id} game={g} faded />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <Card className="lg:sticky lg:top-20">
            <CardTitle>Novo jogo</CardTitle>
            <NewGame onCreate={onCreate} groups={groups} />
          </Card>
        </div>
      </Page>
    </>
  );
}
