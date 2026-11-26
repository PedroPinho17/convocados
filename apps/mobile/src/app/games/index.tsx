import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import type { CreateGameInput, GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames } from "../../lib/api";
import { signOut } from "../../lib/session";
import { GameForm } from "../../components/game-form";

export default function GamesScreen() {
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Muda a key do formulário para o limpar depois de criar um jogo.
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setGames(await listGames());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onCreate(input: CreateGameInput) {
    await createGame(input);
    setFormKey((k) => k + 1);
    await load();
  }

  async function onLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={games}
      keyExtractor={(g) => g.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Os meus jogos</Text>
            <View style={styles.actions}>
              <Link href="/settings" asChild>
                <Pressable>
                  <Text style={styles.link}>Lembretes</Text>
                </Pressable>
              </Link>
              <Pressable onPress={onLogout}>
                <Text style={styles.link}>Sair</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.section}>Novo jogo</Text>
          <GameForm key={formKey} submitLabel="Criar jogo" onSubmit={onCreate} />

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Ainda não tens jogos.</Text>}
      renderItem={({ item }) => (
        <Link href={`/games/${item.id}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.location} · {new Date(item.startsAt).toLocaleString("pt-PT")} · código {item.inviteCode}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { gap: 10, marginBottom: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 16 },
  section: { fontWeight: "600", marginTop: 8 },
  link: { textDecorationLine: "underline", color: "#52525b" },
  error: { color: "#dc2626" },
  empty: { color: "#71717a" },
  card: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, padding: 14, marginBottom: 8 },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardMeta: { color: "#52525b", fontSize: 13 },
});
