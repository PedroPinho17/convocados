"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateGameInput, GameDto, ParsedGameDraft } from "@convocados/shared";
import { ApiError, createGame, listGames, logout, parseGameMessage } from "@/lib/api";
import { resetSocket } from "@/lib/socket";
import { GameForm } from "@/components/game-form";

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<ParsedGameDraft | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

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
    setDraft(null);
    setPaste("");
    setAiInfo(null);
    setGames(await listGames());
  }

  async function onParse() {
    setAiInfo(null);
    setError(null);
    setAiPending(true);
    try {
      const result = await parseGameMessage({ message: paste });
      setDraft(result.draft);
      setFormKey((k) => k + 1);
      if (result.ok) {
        setAiInfo(`Campos preenchidos. Restam ${result.remainingToday} pedidos IA hoje.`);
      } else {
        setAiInfo(
          result.draft.notes ??
            `A IA não conseguiu extrair bem os dados — completa o formulário. Restam ${result.remainingToday} pedidos hoje.`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setAiInfo(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Erro ao analisar a mensagem.");
      }
    } finally {
      setAiPending(false);
    }
  }

  async function onLogout() {
    await logout().catch(() => undefined);
    resetSocket();
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
        <p className="text-sm text-zinc-600">
          Cola uma mensagem (WhatsApp, SMS…) ou preenche o formulário à mão.
        </p>
        <textarea
          className="min-h-24 rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Ex.: Jogo quinta 21h no Romaniz, 10 jogadores, campo 30€"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button
          type="button"
          disabled={aiPending || paste.trim().length < 10}
          onClick={() => void onParse()}
          className="self-start rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          {aiPending ? "A analisar…" : "Preencher com IA"}
        </button>
        {aiInfo ? <p className="text-sm text-zinc-600">{aiInfo}</p> : null}
        <GameForm key={formKey} draft={draft} submitLabel="Criar jogo" onSubmit={onCreate} />
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
              {g.location} · {new Date(g.startsAt).toLocaleString("pt-PT")} · {g.slots} vagas · código{" "}
              {g.inviteCode}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
