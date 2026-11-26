import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { toLocalDateTimeInput, type CreateGameInput, type GameDto } from "@convocados/shared";
import { ApiError } from "../lib/api";
import { priceRangeText } from "../lib/price";

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
  const [startsAt, setStartsAt] = useState(game ? toLocalDateTimeInput(game.startsAt) : ""); // ex: 2026-11-27T21:00
  const [slots, setSlots] = useState(String(game?.slots ?? 10));
  const [subs, setSubs] = useState(String(game?.subs ?? 2));
  const [totalEuros, setTotalEuros] = useState(game ? String(game.totalPriceCents / 100) : "30");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const s = Number(slots) || 0;
  const b = Number(subs) || 0;
  const totalPriceCents = Math.round((Number(totalEuros.replace(",", ".")) || 0) * 100);

  async function handleSubmit() {
    setError(null);
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      setError("Data inválida. Usa o formato 2026-11-27T21:00.");
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

  return (
    <View style={styles.form}>
      <TextInput style={styles.input} placeholder="Título" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Local" value={location} onChangeText={setLocation} />
      <TextInput
        style={styles.input}
        placeholder="Data (2026-11-27T21:00)"
        value={startsAt}
        onChangeText={setStartsAt}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half]} placeholder="Vagas" keyboardType="number-pad" value={slots} onChangeText={setSlots} />
        <TextInput style={[styles.input, styles.half]} placeholder="Lista de espera (máx.)" keyboardType="number-pad" value={subs} onChangeText={setSubs} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Custo total (€)"
        keyboardType="decimal-pad"
        value={totalEuros}
        onChangeText={setTotalEuros}
      />
      <Text style={styles.hint}>{priceRangeText({ totalPriceCents, slots: s })}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.row}>
        <Pressable style={[styles.button, styles.half]} onPress={handleSubmit} disabled={pending}>
          {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </Pressable>
        {onCancel && (
          <Pressable style={styles.secondary} onPress={onCancel} disabled={pending}>
            <Text>Cancelar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  input: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  hint: { color: "#71717a", fontSize: 12 },
  button: { backgroundColor: "#18181b", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  error: { color: "#dc2626" },
});
