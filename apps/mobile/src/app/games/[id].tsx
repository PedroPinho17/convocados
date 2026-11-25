import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { formatEuros, type CreateGameInput, type GameDto } from "@convocados/shared";
import { ApiError, getGame, getMe, updateGame } from "../../lib/api";
import { priceRangeText } from "../../lib/price";
import { GameForm } from "../../components/game-form";

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<GameDto | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGame(id), getMe()])
      .then(([g, me]) => {
        setGame(g);
        setMeId(me.id);
      })
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

  const isOrganizer = meId === game.organizerId;

  async function onSave(input: CreateGameInput) {
    setGame(await updateGame(id, input));
    setEditing(false);
  }

  if (editing) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Editar jogo</Text>
        <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{game.title}</Text>
        {isOrganizer && (
          <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
            <Text>Editar</Text>
          </Pressable>
        )}
      </View>
      <Text>{game.location}</Text>
      <Text>{new Date(game.startsAt).toLocaleString("pt-PT")}</Text>
      <Text>
        {game.slots} vagas · {game.subs} suplentes · total {formatEuros(game.totalPriceCents)}
      </Text>
      <Text style={styles.muted}>{priceRangeText(game)}</Text>
      <Text>
        Código: <Text style={styles.bold}>{game.inviteCode}</Text>
      </Text>
      <Text>Estado: {game.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 },
  title: { fontSize: 24, fontWeight: "600", flexShrink: 1 },
  editButton: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  bold: { fontWeight: "700" },
  muted: { color: "#52525b" },
  error: { color: "#dc2626", padding: 16 },
});
