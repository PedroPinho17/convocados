"use client";

import { useState } from "react";
import { toLocalDateTimeInput, type CreateGameInput, type GameDto } from "@convocados/shared";
import { ApiError } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";

type Props = {
  /** Jogo a editar; sem ele, o formulário cria um jogo novo. */
  game?: GameDto;
  submitLabel: string;
  onSubmit: (input: CreateGameInput) => Promise<void>;
  onCancel?: () => void;
};

/** Formulário de criar e de editar um jogo. */
export function GameForm({ game, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(game?.title ?? "");
  const [location, setLocation] = useState(game?.location ?? "");
  const [startsAt, setStartsAt] = useState(game ? toLocalDateTimeInput(game.startsAt) : "");
  const [slots, setSlots] = useState(game?.slots ?? 10);
  const [subs, setSubs] = useState(game?.subs ?? 2);
  const [totalEuros, setTotalEuros] = useState(game ? game.totalPriceCents / 100 : 30);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const totalPriceCents = Math.round((Number.isFinite(totalEuros) ? totalEuros : 0) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // datetime-local (hora local) → ISO
      await onSubmit({
        title,
        location,
        startsAt: new Date(startsAt).toISOString(),
        slots,
        subs,
        totalPriceCents,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar o jogo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-zinc-200 p-4">
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
        <PriceRangeText totalPriceCents={totalPriceCents} slots={slots} subs={subs} />
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">
          {pending ? "A guardar…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending} className="rounded border px-3 py-2">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
