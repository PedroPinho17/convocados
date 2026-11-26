import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, router, useFocusEffect, useNavigation } from "expo-router";
import { sportLabel, type CreateGameInput, type GameDto } from "@convocados/shared";
import { ApiError, createGame, listGames } from "../../lib/api";
import { signOut } from "../../lib/session";
import { NewGame } from "../../components/new-game";
import { Badge, Card, CardTitle, Columns, Notice, Screen } from "../../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../../lib/theme";

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("pt-PT", { weekday: "short" }),
    day: d.toLocaleDateString("pt-PT", { day: "numeric" }),
    month: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function GamesScreen() {
  const s = useThemedStyles(styles);
  const navigation = useNavigation();
  // A lista e a hora a que chegou (separa próximos e anteriores sem ler a hora no render).
  const [loaded, setLoaded] = useState<{ games: GameDto[]; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoaded({ games: await listGames(), at: Date.now() });
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

  // Ações no cabeçalho do ecrã (como uma app nativa).
  useLayoutEffect(() => {
    async function onLogout() {
      await signOut();
      router.replace("/login");
    }
    navigation.setOptions({
      headerRight: () => (
        <View style={s.headerActions}>
          <Link href="/settings" asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text style={s.headerLink}>Definições</Text>
            </Pressable>
          </Link>
          <Pressable onPress={() => void onLogout()} hitSlop={8} accessibilityRole="button">
            <Text style={s.headerLink}>Sair</Text>
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

  const list = (
    <View style={{ gap: 12 }}>
      <Text style={s.section}>PRÓXIMOS</Text>
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
            <NewGame onCreate={onCreate} />
          </Card>
        }
      />
    </Screen>
  );
}

function GameCard({ game, faded }: { game: GameDto; faded?: boolean }) {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const { weekday, day, month, time } = dateParts(game.startsAt);
  const cancelled = game.status === "cancelled";
  const dim = cancelled ? { color: c.muted } : null;
  return (
    <Link href={`/games/${game.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${game.title}, ${weekday} ${day} ${month} às ${time}, ${game.location}${cancelled ? ", cancelado" : ""}`}
        style={({ pressed }) => [s.card, faded ? { opacity: 0.75 } : null, pressed ? { borderColor: c.brand } : null]}
      >
        <View style={[s.dateBox, cancelled ? { backgroundColor: c.surface2 } : null]}>
          <Text style={[s.dateSmall, dim]}>{weekday.toUpperCase()}</Text>
          <Text style={[s.dateDay, dim]}>{day}</Text>
          <Text style={[s.dateSmall, dim]}>{month.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {game.title}
            </Text>
            {cancelled ? <Badge label="Cancelado" tone="danger" /> : null}
          </View>
          <Text style={s.muted} numberOfLines={1}>
            {sportLabel(game.sport)}
            {game.groupName ? ` · ${game.groupName}` : ""}
          </Text>
          <Text style={s.muted} numberOfLines={1}>
            {game.location}
          </Text>
          <Text style={s.muted}>
            {time} · {game.slots} vagas
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = (c: Palette) => ({
  title: { fontSize: 28, fontWeight: "800" as const, color: c.ink },
  section: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.8, color: c.muted },
  muted: { color: c.muted, fontSize: 14 },
  emptyTitle: { fontWeight: "700" as const, color: c.ink, fontSize: 16 },
  headerActions: { flexDirection: "row" as const, gap: 18 },
  headerLink: { color: c.brandStrong, fontWeight: "700" as const, fontSize: 15 },
  card: {
    flexDirection: "row" as const,
    gap: 14,
    alignItems: "center" as const,
    backgroundColor: c.surface,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
  },
  dateBox: {
    width: 58,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
  },
  dateSmall: { fontSize: 11, fontWeight: "700" as const, color: c.brandStrong },
  dateDay: { fontSize: 22, fontWeight: "800" as const, color: c.brandStrong, lineHeight: 26 },
  cardTitle: { fontSize: 16, fontWeight: "700" as const, color: c.ink, flexShrink: 1 },
});
