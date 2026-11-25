"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames, logout } from "@/lib/api";

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [slots, setSlots] = useState(10);
  const [subs, setSubs] = useState(2);
  const [totalEuros, setTotalEuros] = useState(30);

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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // datetime-local → ISO
      const iso = new Date(startsAt).toISOString();
      const players = slots + subs;
      const priceCents = Math.round(totalEuros * 100 / players);
      await createGame({
        title,
        location,
        startsAt: iso,
        slots,
        subs,
        priceCents,
      });
      setTitle("");
      setLocation("");
      setStartsAt("");
      setGames(await listGames());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar jogo.");
    } finally {
      setPending(false);
    }
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

      <form onSubmit={onCreate} className="flex flex-col gap-2 rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Novo jogo</h2>
        <input className="rounded border px-3 py-2" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="rounded border px-3 py-2" placeholder="Local" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <input className="rounded border px-3 py-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Vagas
            <input
              className="rounded border px-3 py-2"
              type="number"
              min={2}
              max={30}
              value={slots}
              onChange={(e) => setSlots(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Suplentes
            <input
              className="rounded border px-3 py-2"
              type="number"
              min={0}
              max={10}
              value={subs}
              onChange={(e) => setSubs(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Custo total (€)
            <input
              className="rounded border px-3 py-2"
              type="number"
              min={0}
              step="0.01"
              value={totalEuros}
              onChange={(e) => setTotalEuros(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          Cada um paga{" "}
          {(slots + subs > 0 ? totalEuros / (slots + subs) : 0).toLocaleString("pt-PT", {
            style: "currency",
            currency: "EUR",
          })}{" "}
          ({slots + subs} jogadores)
        </p>
        <button type="submit" disabled={pending} className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">
          {pending ? "A criar…" : "Criar jogo"}
        </button>
      </form>

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