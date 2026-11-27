import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  PREFERRED_FEET,
  PREFERRED_FOOT_LABELS,
  PREFERRED_POSITION_LABELS,
  PREFERRED_POSITIONS,
  type PlayerProfileDto,
  type PreferredFoot,
  type PreferredPosition,
  type UpdateProfileInput,
} from "@convocados/shared";
import { ApiError, updateMyProfile } from "../lib/api";
import { Button, Field, Notice } from "./ui";
import { radius, useThemedStyles, type Palette } from "../lib/theme";

type Props = {
  profile: PlayerProfileDto;
  onSaved: (profile: PlayerProfileDto) => void;
};

export function ProfileForm({ profile, onSaved }: Props) {
  const s = useThemedStyles(styles);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition | null>(
    profile.preferredPosition,
  );
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot | null>(
    profile.preferredFoot,
  );
  const [city, setCity] = useState(profile.city ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSave() {
    setError(null);
    setOk(false);
    setPending(true);
    const input: UpdateProfileInput = {
      displayName: displayName.trim(),
      preferredPosition,
      preferredFoot,
      city: city.trim() === "" ? null : city.trim(),
      bio: bio.trim() === "" ? null : bio.trim(),
    };
    try {
      onSaved(await updateMyProfile(input));
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar o perfil.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={s.form}>
      <Field
        label="Nome"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={80}
        autoComplete="nickname"
      />

      <View style={s.field}>
        <Text style={s.label}>Posição preferida</Text>
        <View style={s.chips}>
          <Chip
            label="Sem preferência"
            active={preferredPosition === null}
            onPress={() => setPreferredPosition(null)}
          />
          {PREFERRED_POSITIONS.map((p) => (
            <Chip
              key={p}
              label={PREFERRED_POSITION_LABELS[p]}
              active={preferredPosition === p}
              onPress={() => setPreferredPosition(p)}
            />
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Pé preferido</Text>
        <View style={s.chips}>
          <Chip
            label="Sem preferência"
            active={preferredFoot === null}
            onPress={() => setPreferredFoot(null)}
          />
          {PREFERRED_FEET.map((f) => (
            <Chip
              key={f}
              label={PREFERRED_FOOT_LABELS[f]}
              active={preferredFoot === f}
              onPress={() => setPreferredFoot(f)}
            />
          ))}
        </View>
      </View>

      <Field
        label="Cidade"
        value={city}
        onChangeText={setCity}
        maxLength={80}
        autoComplete="postal-address"
      />

      <Field
        label={`Bio (${bio.length}/280)`}
        value={bio}
        onChangeText={setBio}
        maxLength={280}
        multiline
      />

      {error ? <Notice tone="danger" text={error} /> : null}
      {ok ? <Notice tone="ok" text="Perfil guardado." /> : null}

      <Button
        label={pending ? "A guardar…" : "Guardar perfil"}
        onPress={() => void onSave()}
        disabled={pending || displayName.trim().length === 0}
        loading={pending}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const s = useThemedStyles(styles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[s.chip, active ? s.chipOn : null]}
    >
      <Text style={active ? s.chipTextOn : s.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = (c: Palette) => ({
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" as const, color: c.ink },
  chips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chipOn: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { color: c.ink, fontSize: 14 },
  chipTextOn: { color: c.brandInk, fontWeight: "700" as const, fontSize: 14 },
});
