"use client";

import { useState } from "react";
import {
  initialGameForm,
  type CreateGameInput,
  type GameDto,
  type ParsedGameDraft,
} from "@convocados/shared";
import { ApiError } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";
import { Button, Notice, inputClass, labelClass } from "@/components/ui";

type Props = {
  /** Jogo a editar; sem ele, o formulário cria um jogo novo. */
  game?: GameDto;
  /** Resultado do parse IA (só criação). */
  draft?: ParsedGameDraft | null;
  submitLabel: string;
  onSubmit: (input: CreateGameInput) => Promise<void>;
  onCancel?: () => void;
};

/** Formulário de criar e de editar um jogo. */
export function GameForm({ game, draft, submitLabel, onSubmit, onCancel }: Props) {
  // Um rascunho novo da IA chega com uma `key` nova (a página recria o formulário),
  // por isso os valores iniciais chegam: não é preciso copiá-lo num efeito.
  const [initial] = useState(() => initialGameForm(game, draft));
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.location);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [slots, setSlots] = useState(initial.slots);
  const [subs, setSubs] = useState(initial.subs);
  const [totalEuros, setTotalEuros] = useState(initial.totalEuros);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {draft?.notes ? <Notice tone="warn">{draft.notes}</Notice> : null}
      <label className={labelClass}>
        Título
        <input
          className={inputClass}
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Local
          <input
            className={inputClass}
            placeholder="Local"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          Dia e hora
          <input
            className={inputClass}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className={labelClass}>
          Vagas
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={2}
            max={30}
            value={slots}
            onChange={(e) => setSlots(Number(e.target.value))}
          />
        </label>
        <label className={labelClass}>
          Lista de espera (máx.)
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={subs}
            onChange={(e) => setSubs(Number(e.target.value))}
          />
        </label>
        <label className={labelClass}>
          Custo total (€)
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={totalEuros}
            onChange={(e) => setTotalEuros(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        <PriceRangeText totalPriceCents={totalPriceCents} slots={slots} />
      </p>
      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending} className="sm:flex-1">
          {pending ? "A guardar…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
