import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import type { CreateGameInput, GameDto, ParsedGameDraft } from "@convocados/shared";
import { ApiError, createGame, listGames, parseGameMessage } from "../../lib/api";
import { signOut } from "../../lib/session";
import { GameForm } from "../../components/game-form";

export default function GamesScreen() {
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<ParsedGameDraft | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

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
    setDraft(null);
    setPaste("");
    setAiInfo(null);
    await load();
  }

  async function onParse() {
    setAiInfo(null);
    setError(null);
    setAiPending(true);
    try {
      const result = await parseGameMessage({ message: paste });
      setDraft(result.draft);
      setFormKey((k) => k + 1);
      if (result.ok) {
        setAiInfo(`Campos preenchidos. Restam ${result.remainingToday} pedidos IA hoje.`);
      } else {
        setAiInfo(
          result.draft.notes ??
            `A IA não conseguiu extrair bem os dados — completa o formulário. Restam ${result.remainingToday} pedidos hoje.`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setAiInfo(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Erro ao analisar a mensagem.");
      }
    } finally {
      setAiPending(false);
    }
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
          <Text style={styles.hint}>Cola uma mensagem ou preenche o formulário à mão.</Text>
          <TextInput
            style={styles.paste}
            multiline
            placeholder="Ex.: Jogo quinta 27/11/2026 21h no Romaniz, 10 jogadores, campo 30€"
            value={paste}
            onChangeText={setPaste}
          />
          <Pressable
            style={[styles.aiButton, (aiPending || paste.trim().length < 10) && styles.disabled]}
            disabled={aiPending || paste.trim().length < 10}
            onPress={() => void onParse()}
          >
            {aiPending ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.aiButtonText}>Preencher com IA</Text>
            )}
          </Pressable>
          {aiInfo ? <Text style={styles.hint}>{aiInfo}</Text> : null}
          <GameForm key={formKey} draft={draft} submitLabel="Criar jogo" onSubmit={onCreate} />

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
  hint: { color: "#52525b", fontSize: 13 },
  paste: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
  },
  aiButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  aiButtonText: { fontWeight: "500" },
  disabled: { opacity: 0.5 },
  link: { textDecorationLine: "underline", color: "#52525b" },
  error: { color: "#dc2626" },
  empty: { color: "#71717a" },
  card: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, padding: 14, marginBottom: 8 },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardMeta: { color: "#52525b", fontSize: 13 },
});
