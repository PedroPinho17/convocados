import { useCallback, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SPORTS, type CreateGameInput, type GroupDetailDto } from "@convocados/shared";
import { ApiError, createGame, getGroup, getMe, leaveGroup, removeGroupMember } from "../../lib/api";
import { GameCard } from "../../components/game-card";
import { NewGame } from "../../components/new-game";
import { Badge, Button, Card, CardTitle, Columns, Muted, Notice, Screen } from "../../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../../lib/theme";

const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useThemedStyles(styles);
  const c = usePalette();
  const [loaded, setLoaded] = useState<{ group: GroupDetailDto; meId: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [group, me] = await Promise.all([getGroup(id), getMe()]);
      setLoaded({ group, meId: me.id, at: Date.now() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Erro ao carregar o grupo.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (error) {
    return (
      <Screen>
        <Notice tone="danger" text={error} />
      </Screen>
    );
  }
  if (!loaded) {
    return (
      <Screen>
        <Muted>A carregar…</Muted>
      </Screen>
    );
  }

  const { group, meId, at } = loaded;
  const isAdmin = group.role === "admin";
  const sport = SPORTS[group.sport];
  const inviteUrl = `${WEB_ORIGIN}/g/${group.inviteCode}`;
  const upcoming = group.games.filter((g) => new Date(g.startsAt).getTime() >= at);
  const past = group.games.filter((g) => new Date(g.startsAt).getTime() < at);

  async function onCreate(input: CreateGameInput) {
    await createGame({ ...input, groupId: group.id });
    await load();
  }

  async function onShare() {
    await Share.share({ message: `Entra no grupo "${group.name}" no Convocados: ${inviteUrl}`, url: inviteUrl });
  }

  function confirmLeave() {
    Alert.alert("Sair do grupo?", "Deixas de ver os jogos do grupo. Podes voltar a entrar pelo link de convite.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () =>
          void leaveGroup(group.id)
            .then(() => router.replace("/groups"))
            .catch((err) => setActionError(err instanceof ApiError ? err.message : "Não foi possível sair.")),
      },
    ]);
  }

  function confirmRemove(userId: string, name: string) {
    Alert.alert(`Remover ${name}?`, "Deixa de ver os jogos do grupo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () =>
          void removeGroupMember(group.id, userId)
            .then(load)
            .catch((err) => setActionError(err instanceof ApiError ? err.message : "Não foi possível remover.")),
      },
    ]);
  }

  const games = (
    <View style={{ gap: 12 }}>
      <Text style={s.section}>PRÓXIMOS JOGOS</Text>
      {upcoming.length === 0 ? (
        <Card style={{ alignItems: "center" }}>
          <Muted>Ainda não há jogos marcados neste grupo.</Muted>
        </Card>
      ) : (
        upcoming.map((g) => <GameCard key={g.id} game={g} showGroup={false} />)
      )}
      {past.length > 0 ? (
        <>
          <Text style={[s.section, { marginTop: 8 }]}>ANTERIORES</Text>
          {past.map((g) => (
            <GameCard key={g.id} game={g} faded showGroup={false} />
          ))}
        </>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Text style={{ fontSize: 30 }}>{sport?.emoji ?? "🏅"}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title} accessibilityRole="header">
            {group.name}
          </Text>
          <Muted>
            {sport?.label ?? group.sport} · {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
            {isAdmin ? " · és admin" : ""}
          </Muted>
        </View>
      </View>
      {actionError ? <Notice tone="danger" text={actionError} /> : null}

      <Columns
        main={games}
        side={
          <View style={{ gap: 16 }}>
            <Card>
              <CardTitle>Novo jogo no grupo</CardTitle>
              <NewGame onCreate={onCreate} groups={[group]} groupId={group.id} />
            </Card>

            <Card>
              <CardTitle>Convidar</CardTitle>
              <View style={{ gap: 10 }}>
                <Muted>Quem abrir o link entra no grupo e passa a ver os jogos.</Muted>
                <Text style={s.link} selectable>
                  {inviteUrl}
                </Text>
                <Button label="Partilhar convite" onPress={() => void onShare()} />
              </View>
            </Card>

            <Card>
              <CardTitle>Membros</CardTitle>
              <View>
                {group.members.map((m, i) => (
                  <View key={m.userId} style={[s.member, i > 0 ? s.memberBorder : null]}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials(m.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>
                        {m.name}
                        {m.userId === meId ? " (tu)" : ""}
                      </Text>
                    </View>
                    {m.role === "admin" ? <Badge label="Admin" tone="brand" /> : null}
                    {isAdmin && m.userId !== meId ? (
                      <Pressable onPress={() => confirmRemove(m.userId, m.name)} hitSlop={8} accessibilityRole="button">
                        <Text style={{ color: c.danger, fontWeight: "600" }}>Remover</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              <Button label="Sair do grupo" variant="danger" style={{ marginTop: 14 }} onPress={confirmLeave} />
            </Card>
          </View>
        }
      />
    </Screen>
  );
}

const styles = (c: Palette) => ({
  header: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14 },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: { fontSize: 24, fontWeight: "800" as const, color: c.ink },
  section: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.8, color: c.muted },
  link: { color: c.brandStrong, fontSize: 13 },
  member: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 10 },
  memberBorder: { borderTopWidth: 1, borderTopColor: c.line },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: { color: c.brandStrong, fontWeight: "700" as const, fontSize: 13 },
  memberName: { color: c.ink, fontWeight: "600" as const, fontSize: 15 },
});
