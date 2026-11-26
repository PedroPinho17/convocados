import { useState } from "react";
import { Text, View } from "react-native";
import {
  initialGameForm,
  type CreateGameInput,
  type GameDto,
  type ParsedGameDraft,
} from "@convocados/shared";
import { ApiError } from "../lib/api";
import { priceRangeText } from "../lib/price";
import { useLayout } from "../lib/theme";
import { Button, Field, Muted, Notice } from "./ui";

type Props = {
  /** Jogo a editar; sem ele, o formulário cria um jogo novo. */
  game?: GameDto;
  /** Rascunho da IA (só ao criar). */
  draft?: ParsedGameDraft | null;
  submitLabel: string;
  onSubmit: (input: CreateGameInput) => Promise<void>;
  onCancel?: () => void;
};

/** Formulário de criar e de editar um jogo. */
export function GameForm({ game, draft, submitLabel, onSubmit, onCancel }: Props) {
  const { width } = useLayout();
  const roomy = width >= 480;
  // Um rascunho novo da IA chega com uma `key` nova (o ecrã recria o formulário),
  // por isso os valores iniciais chegam: não é preciso copiá-lo num efeito.
  const [initial] = useState(() => initialGameForm(game, draft));
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.location);
  // "2026-11-27T21:00" separado em dia e hora: mais fácil de escrever no telemóvel.
  const [day, setDay] = useState(initial.startsAt.slice(0, 10));
  const [time, setTime] = useState(initial.startsAt.slice(11, 16));
  const [slots, setSlots] = useState(String(initial.slots));
  const [subs, setSubs] = useState(String(initial.subs));
  const [totalEuros, setTotalEuros] = useState(String(initial.totalEuros));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const s = Number(slots) || 0;
  const b = Number(subs) || 0;
  const totalPriceCents = Math.round((Number(totalEuros.replace(",", ".")) || 0) * 100);

  async function handleSubmit() {
    setError(null);
    const date = new Date(`${day.trim()}T${time.trim().padStart(5, "0")}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.trim()) || !/^\d{1,2}:\d{2}$/.test(time.trim()) || Number.isNaN(date.getTime())) {
      setError("Data inválida. Dia como 2026-11-27 e hora como 21:00.");
      return;
    }
    setPending(true);
    try {
      await onSubmit({
        title: title.trim(),
        location: location.trim(),
        startsAt: date.toISOString(),
        slots: s,
        subs: b,
        totalPriceCents,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar o jogo.");
    } finally {
      setPending(false);
    }
  }

  const row = { flexDirection: roomy ? ("row" as const) : ("column" as const), gap: 12 };
  const cell = roomy ? { flex: 1 } : undefined;

  return (
    <View style={{ gap: 14 }}>
      {draft?.notes ? <Notice tone="warn" text={draft.notes} /> : null}
      <Field label="Título" placeholder="Título" value={title} onChangeText={setTitle} />
      <Field label="Local" placeholder="Local" value={location} onChangeText={setLocation} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 3 }}>
          <Field
            label="Dia"
            placeholder="2026-11-27"
            value={day}
            onChangeText={setDay}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ flex: 2 }}>
          <Field
            label="Hora"
            placeholder="21:00"
            value={time}
            onChangeText={setTime}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <View style={row}>
        <View style={cell}>
          <Field label="Vagas" placeholder="Vagas" keyboardType="number-pad" value={slots} onChangeText={setSlots} />
        </View>
        <View style={cell}>
          <Field
            label="Lista de espera (máx.)"
            placeholder="Lista de espera (máx.)"
            keyboardType="number-pad"
            value={subs}
            onChangeText={setSubs}
          />
        </View>
        <View style={cell}>
          <Field
            label="Custo total (€)"
            placeholder="Custo total (€)"
            keyboardType="decimal-pad"
            value={totalEuros}
            onChangeText={setTotalEuros}
          />
        </View>
      </View>
      <Muted>{priceRangeText({ totalPriceCents, slots: s })}</Muted>

      {error ? <Notice tone="danger" text={error} /> : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {onCancel ? (
          <Button label="Cancelar" variant="secondary" onPress={onCancel} disabled={pending} />
        ) : null}
        <Button label={submitLabel} onPress={handleSubmit} loading={pending} style={{ flex: 1 }} />
      </View>
      <Text style={{ height: 0 }} />
    </View>
  );
}
