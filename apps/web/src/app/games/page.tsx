"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateGameInput, GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames, logout } from "@/lib/api";
import { GameForm } from "@/components/game-form";

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Muda a key do formulário para o limpar depois de criar um jogo.
  const [formKey, setFormKey] = useState(0);

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
        if (!cancelled) setGames(rows);
      })
      .catch(onLoadError);
    return () => {
      cancelled = true;
    };
  }, [onLoadError]);

  async function onCreate(input: CreateGameInput) {
    await createGame(input);
    setFormKey((k) => k + 1);
    setGames(await listGames());
  }

  async function onLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Os meus jogos</h1>
        <button type="button" onClick={onLogout} className="text-sm underline">
          Sair
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Novo jogo</h2>
        <GameForm key={formKey} submitLabel="Criar jogo" onSubmit={onCreate} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-3">
        {games.length === 0 && <li className="text-zinc-500">Ainda não tens jogos.</li>}
        {games.map((g) => (
          <li key={g.id} className="rounded border border-zinc-200 p-4">
            <Link href={`/games/${g.id}`} className="font-medium underline">
              {g.title}
            </Link>
            <p className="text-sm text-zinc-600">
              {g.location} · {new Date(g.startsAt).toLocaleString("pt-PT")} · {g.slots} vagas · código {g.inviteCode}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
