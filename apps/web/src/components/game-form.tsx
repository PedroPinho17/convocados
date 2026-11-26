"use client";

import { useState } from "react";
import {
  SPORTS,
  SPORT_KEYS,
  initialGameForm,
  type CreateGameInput,
  type GameDto,
  type GroupDto,
  type ParsedGameDraft,
  type Sport,
} from "@convocados/shared";
import { ApiError } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";
import { VenuePicker } from "@/components/venue-picker";
import { Button, Notice, inputClass, labelClass } from "@/components/ui";

type Props = {
  /** Jogo a editar; sem ele, o formulário cria um jogo novo. */
  game?: GameDto;
  /** Resultado do parse IA (só criação). */
  draft?: ParsedGameDraft | null;
  /** Grupos onde posso criar jogos (só criação). */
  groups?: GroupDto[];
  /** Grupo já escolhido (ex.: criar a partir da página do grupo). */
  groupId?: string | null;
  submitLabel: string;
  onSubmit: (input: CreateGameInput) => Promise<void>;
  onCancel?: () => void;
};

/** Formulário de criar e de editar um jogo. */
export function GameForm({ game, draft, groups = [], groupId: fixedGroupId, submitLabel, onSubmit, onCancel }: Props) {
  // Um rascunho novo da IA chega com uma `key` nova (a página recria o formulário),
  // por isso os valores iniciais chegam: não é preciso copiá-lo num efeito.
  const fixedGroup = groups.find((g) => g.id === fixedGroupId);
  const [initial] = useState(() =>
    initialGameForm(game, draft, { sport: fixedGroup?.sport }),
  );
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.location);
  const [venueId, setVenueId] = useState<string | null>(initial.venueId);
  // "2030-01-10T21:00" separado: os campos de data e hora do browser não ficam cortados.
  const [day, setDay] = useState(initial.startsAt.slice(0, 10));
  const [time, setTime] = useState(initial.startsAt.slice(11, 16));
  const [sport, setSport] = useState<Sport>(initial.sport);
  const [groupId, setGroupId] = useState<string>(fixedGroupId ?? "");
  const [slots, setSlots] = useState(initial.slots);
  const [subs, setSubs] = useState(initial.subs);
  const [totalEuros, setTotalEuros] = useState(initial.totalEuros);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const totalPriceCents = Math.round((Number.isFinite(totalEuros) ? totalEuros : 0) * 100);
  const creating = !game;

  /** Mudar de desporto troca as vagas por defeito, se ainda não as mudaste. */
  function changeSport(next: Sport) {
    if (slots === SPORTS[sport].slots) setSlots(SPORTS[next].slots);
    if (subs === SPORTS[sport].subs) setSubs(SPORTS[next].subs);
    setSport(next);
  }

  function changeGroup(id: string) {
    setGroupId(id);
    const g = groups.find((x) => x.id === id);
    if (g && creating) changeSport(g.sport);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const startsAt = new Date(`${day}T${time}`);
    if (!day || !time || Number.isNaN(startsAt.getTime())) {
      setError("Escolhe o dia e a hora do jogo.");
      return;
    }
    setPending(true);
    try {
      await onSubmit({
        title,
        location,
        // dia e hora locais → ISO (UTC)
        startsAt: startsAt.toISOString(),
        slots,
        subs,
        totalPriceCents,
        sport,
        venueId,
        ...(creating ? { groupId: groupId || null } : {}),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Desporto
          <select className={inputClass} value={sport} onChange={(e) => changeSport(e.target.value as Sport)}>
            {SPORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {SPORTS[k].emoji} {SPORTS[k].label}
              </option>
            ))}
          </select>
        </label>
        {creating && groups.length > 0 ? (
          <label className={labelClass}>
            Grupo
            <select
              className={inputClass}
              value={groupId}
              disabled={Boolean(fixedGroupId)}
              onChange={(e) => changeGroup(e.target.value)}
            >
              <option value="">Sem grupo (só por convite)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

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

      <VenuePicker
        value={location}
        venueId={venueId}
        sport={sport}
        onChange={(text, id) => {
          setLocation(text);
          setVenueId(id);
        }}
      />

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
        <label className={labelClass}>
          Dia
          <input className={inputClass} type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
        </label>
        <label className={labelClass}>
          Hora
          <input
            className={inputClass}
            type="time"
            step={300}
            value={time}
            onChange={(e) => setTime(e.target.value)}
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
        <label className={labelClass} title="Quantos podem ficar em lista de espera">
          Suplentes
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
          Custo (€)
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
