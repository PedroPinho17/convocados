import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  SPORTS,
  SPORT_KEYS,
  initialGameForm,
  type CreateGameInput,
  type GameDto,
  type ParsedGameDraft,
  type Sport,
} from "@convocados/shared";
import { ApiError } from "../lib/api";
import { priceRangeText } from "../lib/price";
import { radius, useLayout, usePalette, useThemedStyles, type Palette } from "../lib/theme";
import { Button, Field, Muted, Notice } from "./ui";
import { VenuePicker } from "./venue-picker";

type Props = {
  /** Jogo a editar; sem ele, o formulário cria um jogo novo. */
  game?: GameDto;
  /** Rascunho da IA (só ao criar). */
  draft?: ParsedGameDraft | null;
  submitLabel: string;
  onSubmit: (input: CreateGameInput) => Promise<void>;
  onCancel?: () => void;
};

function parseInitialDate(startsAt: string): Date {
  const d = new Date(startsAt.includes("T") && !startsAt.endsWith("Z") ? startsAt : startsAt);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/** Formulário de criar e de editar um jogo. */
export function GameForm({ game, draft, submitLabel, onSubmit, onCancel }: Props) {
  const { width } = useLayout();
  const roomy = width >= 480;
  const c = usePalette();
  const s = useThemedStyles(pickerStyles);

  // Um rascunho novo da IA chega com uma `key` nova (o ecrã recria o formulário),
  // por isso os valores iniciais chegam: não é preciso copiá-lo num efeito.
  const [initial] = useState(() => initialGameForm(game, draft));
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.location);
  const [venueId, setVenueId] = useState<string | null>(initial.venueId);
  const [sport, setSport] = useState<Sport>(initial.sport);
  const [startsAt, setStartsAt] = useState(() => parseInitialDate(initial.startsAt));
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [slots, setSlots] = useState(String(initial.slots));
  const [subs, setSubs] = useState(String(initial.subs));
  const [totalEuros, setTotalEuros] = useState(String(initial.totalEuros));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const slotsN = Number(slots) || 0;
  const subsN = Number(subs) || 0;
  const totalPriceCents = Math.round((Number(totalEuros.replace(",", ".")) || 0) * 100);

  function changeSport(next: Sport) {
    if (slotsN === SPORTS[sport].slots) setSlots(String(SPORTS[next].slots));
    if (subsN === SPORTS[sport].subs) setSubs(String(SPORTS[next].subs));
    setSport(next);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    // No Android o dialog fecha sozinho; no iOS mantemos aberto até tocares outra vez.
    if (Platform.OS === "android") setPicker(null);
    if (event.type === "dismissed" || !selected) return;

    setStartsAt((prev) => {
      const next = new Date(prev);
      if (picker === "date") {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Data inválida.");
      return;
    }
    setPending(true);
    try {
      await onSubmit({
        title: title.trim(),
        location: location.trim(),
        startsAt: startsAt.toISOString(),
        slots: slotsN,
        subs: subsN,
        totalPriceCents,
        sport,
        venueId,
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

      <View style={{ gap: 6 }}>
        <Text style={s.label}>Desporto</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SPORT_KEYS.map((k) => {
            const active = sport === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => changeSport(k)}
                style={[s.chip, active ? { backgroundColor: c.brandSoft, borderColor: c.brand } : null]}
              >
                <Text style={{ color: active ? c.brandStrong : c.ink, fontWeight: "600" }}>
                  {SPORTS[k].emoji} {SPORTS[k].label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Field label="Título" placeholder="Título" value={title} onChangeText={setTitle} />
      <VenuePicker
        value={location}
        venueId={venueId}
        sport={sport}
        onChange={(text, id) => {
          setLocation(text);
          setVenueId(id);
        }}
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 3, gap: 6 }}>
          <Text style={s.label}>Dia</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher dia"
            onPress={() => setPicker(picker === "date" ? null : "date")}
            style={s.inputLike}
          >
            <Text style={{ color: c.ink, fontSize: 16 }}>{formatDay(startsAt)}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 2, gap: 6 }}>
          <Text style={s.label}>Hora</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher hora"
            onPress={() => setPicker(picker === "time" ? null : "time")}
            style={s.inputLike}
          >
            <Text style={{ color: c.ink, fontSize: 16 }}>{formatTime(startsAt)}</Text>
          </Pressable>
        </View>
      </View>

      {picker ? (
        <DateTimePicker
          value={startsAt}
          mode={picker}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
          locale="pt-PT"
        />
      ) : null}

      <View style={row}>
        <View style={cell}>
          <Field label="Vagas" placeholder="Vagas" keyboardType="number-pad" value={slots} onChangeText={setSlots} />
        </View>
        <View style={cell}>
          <Field
            label="Suplentes"
            placeholder="Suplentes"
            keyboardType="number-pad"
            value={subs}
            onChangeText={setSubs}
          />
        </View>
        <View style={cell}>
          <Field
            label="Custo (€)"
            placeholder="Custo (€)"
            keyboardType="decimal-pad"
            value={totalEuros}
            onChangeText={setTotalEuros}
          />
        </View>
      </View>
      <Muted>{priceRangeText({ totalPriceCents, slots: slotsN })}</Muted>

      {error ? <Notice tone="danger" text={error} /> : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {onCancel ? (
          <Button label="Cancelar" variant="secondary" onPress={onCancel} disabled={pending} />
        ) : null}
        <Button label={submitLabel} onPress={handleSubmit} loading={pending} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const pickerStyles = (c: Palette) => ({
  label: { fontSize: 14, fontWeight: "600" as const, color: c.ink },
  inputLike: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center" as const,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
    justifyContent: "center" as const,
  },
});
