import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { PlayerProfileDto } from "@convocados/shared";
import { ApiError, getPlayerProfile } from "../../lib/api";
import { PlayerProfileView } from "../../components/player-profile-view";
import { Notice, Screen } from "../../components/ui";
import { usePalette, useThemedStyles, type Palette } from "../../lib/theme";

export default function PublicPlayerScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PlayerProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    getPlayerProfile(id)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? "Jogador não encontrado."
              : err.message
            : "Erro ao carregar o perfil.",
        );
      });
  }, [id]);

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
    </Screen>
  );
}

const styles = (_c: Palette) => ({
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
});
