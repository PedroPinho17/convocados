import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import type { GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames, logout } from "../../lib/api";
import { priceRangeText } from "../../lib/price";

export default function GamesScreen() {
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(""); // ex: 2026-11-27T21:00
  const [slots, setSlots] = useState("10");
  const [subs, setSubs] = useState("2");
  const [totalEuros, setTotalEuros] = useState("30");

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

  const s = Number(slots) || 0;
  const b = Number(subs) || 0;
  const totalPriceCents = Math.round((Number(totalEuros.replace(",", ".")) || 0) * 100);

  async function onCreate() {
    setError(null);
    setPending(true);
    try {
      const iso = new Date(startsAt).toISOString();
      await createGame({
        title,
        location,
        startsAt: iso,
        slots: s,
        subs: b,
        totalPriceCents,
      });
      setTitle("");
      setLocation("");
      setStartsAt("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar.");
    } finally {
      setPending(false);
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={games}
      keyExtractor={(g) => g.id}
      ListHeaderComponent={
        <View style={styles.form}>
          <View style={styles.header}>
            <Text style={styles.title}>Os meus jogos</Text>
            <Pressable onPress={onLogout}>
              <Text style={styles.link}>Sair</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>Novo jogo</Text>
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
            <TextInput style={[styles.input, styles.half]} placeholder="Suplentes" keyboardType="number-pad" value={subs} onChangeText={setSubs} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Custo total (€)"
            keyboardType="decimal-pad"
            value={totalEuros}
            onChangeText={setTotalEuros}
          />
          <Text style={styles.hint}>
            {priceRangeText({ totalPriceCents, slots: s, subs: b })}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={onCreate} disabled={pending}>
            {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar jogo</Text>}
          </Pressable>
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
  form: { gap: 10, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "600" },
  section: { fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  hint: { color: "#71717a", fontSize: 12 },
  button: { backgroundColor: "#18181b", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textDecorationLine: "underline", color: "#52525b" },
  error: { color: "#dc2626" },
  empty: { color: "#71717a" },
  card: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, padding: 14, marginBottom: 8 },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardMeta: { color: "#52525b", fontSize: 13 },
});