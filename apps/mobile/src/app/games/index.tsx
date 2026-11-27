import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useNavigation } from "expo-router";
import type { CreateGameInput, GameDto, GroupDto } from "@convocados/shared";
import { ApiError, createGame, listGames, listGroups } from "../../lib/api";
import { NewGame } from "../../components/new-game";
import { GameCard } from "../../components/game-card";
import { Card, CardTitle, Columns, Notice, Screen } from "../../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../../lib/theme";

export default function GamesScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const navigation = useNavigation();
  // A lista e a hora a que chegou (separa próximos e anteriores sem ler a hora no render).
  const [loaded, setLoaded] = useState<{ games: GameDto[]; at: number } | null>(null);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [games, myGroups] = await Promise.all([listGames(), listGroups().catch(() => [])]);
      setLoaded({ games, at: Date.now() });
      setGroups(myGroups);
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

  // Perfil + Definições no cabeçalho; "Sair" está nas Definições.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Pressable onPress={() => router.push("/profile")} hitSlop={10} accessibilityRole="link">
            <Text style={s.headerLink}>Perfil</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10} accessibilityRole="link">
            <Text style={s.headerLink}>Definições</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, s]);

  async function onCreate(input: CreateGameInput) {
    await createGame(input);
    await load();
  }

  const games = loaded?.games ?? [];
  const now = loaded?.at ?? 0;
  const upcoming = games.filter((g) => new Date(g.startsAt).getTime() >= now);
  const past = games.filter((g) => new Date(g.startsAt).getTime() < now).reverse();

  const groupsEntry = (
    <Pressable
      onPress={() => router.push("/groups")}
      accessibilityRole="link"
      style={({ pressed }) => [s.groupsEntry, pressed ? { borderColor: c.brand } : null]}
    >
      <View style={s.groupsIcon}>
        <Text style={{ fontSize: 22 }}>👥</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.groupsTitle}>{groups.length > 0 ? "Os meus grupos" : "Criar um grupo"}</Text>
        <Text style={s.muted} numberOfLines={2}>
          {groups.length > 0
            ? `${groups.length} ${groups.length === 1 ? "grupo" : "grupos"} · ${groups.map((g) => g.name).join(", ")}`
            : "Para quem joga sempre junto: os jogos do grupo aparecem a todos."}
        </Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );

  const list = (
    <View style={{ gap: 12 }}>
      {groupsEntry}
      <Text style={[s.section, { marginTop: 8 }]}>PRÓXIMOS</Text>
      {loaded === null ? (
        <Text style={s.muted}>A carregar…</Text>
      ) : upcoming.length === 0 ? (
        <Card style={{ alignItems: "center" }}>
          <Text style={s.emptyTitle}>Ainda não tens jogos.</Text>
          <Text style={s.muted}>Cria um jogo e partilha o convite no grupo.</Text>
        </Card>
      ) : (
        upcoming.map((g) => <GameCard key={g.id} game={g} />)
      )}
      {past.length > 0 ? (
        <>
          <Text style={[s.section, { marginTop: 8 }]}>ANTERIORES</Text>
          {past.map((g) => (
            <GameCard key={g.id} game={g} faded />
          ))}
        </>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <Text style={s.title} accessibilityRole="header">
        Os meus jogos
      </Text>
      {error ? <Notice tone="danger" text={error} /> : null}
      <Columns
        main={list}
        side={
          <Card>
            <CardTitle>Novo jogo</CardTitle>
            <NewGame onCreate={onCreate} groups={groups} />
          </Card>
        }
      />
    </Screen>
  );
}

const styles = (c: Palette) => ({
  title: { fontSize: 28, fontWeight: "800" as const, color: c.ink },
  section: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.8, color: c.muted },
  muted: { color: c.muted, fontSize: 14 },
  emptyTitle: { fontWeight: "700" as const, color: c.ink, fontSize: 16 },
  headerLink: { color: c.brandStrong, fontWeight: "700" as const, fontSize: 15, paddingHorizontal: 4 },
  groupsEntry: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    padding: 14,
    paddingRight: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  groupsIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  groupsTitle: { fontSize: 16, fontWeight: "700" as const, color: c.ink },
  chevron: { color: c.muted, fontSize: 26, fontWeight: "300" as const },
});
