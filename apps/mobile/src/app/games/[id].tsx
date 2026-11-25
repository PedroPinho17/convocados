import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import type { GameDto } from "@convocados/shared";
import { ApiError, getGame } from "../../lib/api";

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<GameDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGame(id)
      .then(setGame)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!game) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{game.title}</Text>
      <Text>{game.location}</Text>
      <Text>{new Date(game.startsAt).toLocaleString("pt-PT")}</Text>
      <Text>
        {game.slots} vagas · {game.subs} suplentes · {(game.priceCents / 100).toFixed(2)} € / pessoa
      </Text>
      <Text>
        Código: <Text style={styles.bold}>{game.inviteCode}</Text>
      </Text>
      <Text>Estado: {game.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
  bold: { fontWeight: "700" },
  error: { color: "#dc2626", padding: 16 },
});