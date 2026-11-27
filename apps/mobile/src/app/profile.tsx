import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PlayerProfileDto } from "@convocados/shared";
import { ApiError, getMyProfile } from "../lib/api";
import { PlayerProfileView } from "../components/player-profile-view";
import { ProfileForm } from "../components/profile-form";
import { Card, CardTitle, Notice, Screen } from "../components/ui";
import { usePalette, useThemedStyles, type Palette } from "../lib/theme";

export default function ProfileScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const [profile, setProfile] = useState<PlayerProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMyProfile()
        .then(setProfile)
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.replace("/login");
            return;
          }
          setError(err instanceof ApiError ? err.message : "Erro ao carregar o perfil.");
        });
    }, []),
  );

  if (error) {
    return (
      <Screen>
        <Notice tone="danger" text={error} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <View style={[s.center, { backgroundColor: c.canvas }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }

  return (
    <Screen>
      <PlayerProfileView profile={profile} />
      <Card>
        <CardTitle>Editar perfil</CardTitle>
        <ProfileForm profile={profile} onSaved={setProfile} />
      </Card>
    </Screen>
  );
}

const styles = (_c: Palette) => ({
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
});
