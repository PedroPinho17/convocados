import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { formatReminder, MAX_REMINDERS, REMINDER_OPTIONS } from "@convocados/shared";
import { ApiError, getReminders, setReminders } from "../lib/api";
import { ensureNotificationPermission } from "../lib/push";
import { syncReminders } from "../lib/reminders";
import { DeleteAccount } from "../components/delete-account";

type Option = (typeof REMINDER_OPTIONS)[number];

export default function SettingsScreen() {
  const [selected, setSelected] = useState<Option[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getReminders()
      .then((r) => setSelected(r.reminderMinutes as Option[]))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
      });
  }, []);

  if (!selected) {
    return error ? (
      <Text style={styles.error}>{error}</Text>
    ) : (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const full = selected.length >= MAX_REMINDERS;

  function toggle(option: Option) {
    setSaved(false);
    setSelected((list) => {
      if (!list) return list;
      if (list.includes(option)) return list.filter((m) => m !== option);
      return list.length >= MAX_REMINDERS ? list : [...list, option];
    });
  }

  async function onSave() {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      await setReminders({ reminderMinutes: selected });
      if (selected.length > 0) await ensureNotificationPermission();
      await syncReminders();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Lembretes antes do jogo</Text>
      <Text style={styles.hint}>
        Escolhe até {MAX_REMINDERS}. Valem para todos os jogos em que estás confirmado.
      </Text>

      {REMINDER_OPTIONS.map((option) => {
        const on = selected.includes(option);
        const disabled = !on && full;
        return (
          <Pressable
            key={option}
            style={[styles.option, on && styles.optionOn, disabled && styles.optionDisabled]}
            onPress={() => toggle(option)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
          >
            <Text style={on ? styles.optionTextOn : undefined}>
              {formatReminder(option)} antes
            </Text>
            <Text style={on ? styles.optionTextOn : styles.hint}>{on ? "✓" : ""}</Text>
          </Pressable>
        );
      })}

      {selected.length === 0 && <Text style={styles.hint}>Sem lembretes.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "A guardar…" : saved ? "Guardado" : "Guardar"}</Text>
      </Pressable>

      <DeleteAccount />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { color: "#71717a" },
  error: { color: "#dc2626", padding: 16 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    padding: 14,
  },
  optionOn: { backgroundColor: "#18181b", borderColor: "#18181b" },
  optionDisabled: { opacity: 0.4 },
  optionTextOn: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
