import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { formatReminder, MAX_REMINDERS, REMINDER_OPTIONS } from "@convocados/shared";
import { ApiError, getReminders, setReminders } from "../lib/api";
import { ensureNotificationPermission } from "../lib/push";
import { syncReminders } from "../lib/reminders";
import { DeleteAccount } from "../components/delete-account";
import { signOut } from "../lib/session";
import { Button, Card, Muted, Notice, Screen } from "../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../lib/theme";

type Option = (typeof REMINDER_OPTIONS)[number];

export default function SettingsScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
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
      <Screen>
        <Notice tone="danger" text={error} />
      </Screen>
    ) : (
      <View style={[s.center, { backgroundColor: c.canvas }]}>
        <ActivityIndicator color={c.brand} />
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
    <Screen>
      <View style={s.narrow}>
        <Card>
          <Text style={s.title} accessibilityRole="header">
            Lembretes antes do jogo
          </Text>
          <Muted>Escolhe até {MAX_REMINDERS}. Valem para todos os jogos em que estás confirmado.</Muted>

          <View style={s.options}>
            {REMINDER_OPTIONS.map((option) => {
              const on = selected.includes(option);
              const disabled = !on && full;
              return (
                <Pressable
                  key={option}
                  style={[s.option, on && s.optionOn, disabled && s.optionDisabled]}
                  onPress={() => toggle(option)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled }}
                >
                  <Text style={on ? s.optionTextOn : s.optionText}>{formatReminder(option)} antes</Text>
                  <Text style={on ? s.optionTextOn : s.optionText}>{on ? "✓" : ""}</Text>
                </Pressable>
              );
            })}
          </View>

          {selected.length === 0 && <Muted>Sem lembretes.</Muted>}
          {error && <Notice tone="danger" text={error} />}

          <Button label={saving ? "A guardar…" : saved ? "Guardado" : "Guardar"} onPress={onSave} disabled={saving} />
        </Card>

        <Card>
          <Button
            label="Terminar sessão"
            variant="secondary"
            onPress={() => void signOut().then(() => router.replace("/login"))}
          />
          <DeleteAccount />
        </Card>
      </View>
    </Screen>
  );
}

const styles = (c: Palette) => ({
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  narrow: { width: "100%" as const, maxWidth: 640, alignSelf: "center" as const, gap: 16 },
  title: { fontSize: 20, fontWeight: "800" as const, color: c.ink },
  options: { gap: 8 },
  option: {
    minHeight: 50,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
  },
  optionOn: { backgroundColor: c.brand, borderColor: c.brand },
  optionDisabled: { opacity: 0.4 },
  optionText: { color: c.ink, fontSize: 15 },
  optionTextOn: { color: c.brandInk, fontWeight: "700" as const, fontSize: 15 },
});
