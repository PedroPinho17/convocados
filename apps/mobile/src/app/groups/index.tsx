import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SPORTS, SPORT_KEYS, type GroupDto, type Sport } from "@convocados/shared";
import { ApiError, createGroup, listGroups } from "../../lib/api";
import { Button, Card, CardTitle, Columns, Field, Muted, Notice, Screen, Badge } from "../../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../../lib/theme";
import { inviteCodeFrom } from "../../lib/invite";

export default function GroupsScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const [groups, setGroups] = useState<GroupDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("football");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await listGroups());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Erro ao carregar os grupos.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      const g = await createGroup({ name: name.trim(), sport });
      setName("");
      router.push(`/groups/${g.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Não foi possível criar o grupo.");
    } finally {
      setCreating(false);
    }
  }

  function onOpenInvite() {
    const code = inviteCodeFrom(invite);
    if (!code) {
      setInviteError("Cola o link do convite do grupo (acaba em /g/ e 12 letras e números).");
      return;
    }
    setInviteError(null);
    setInvite("");
    router.push(`/g/${code}`);
  }

  const list = (
    <View style={{ gap: 12 }}>
      <Muted>
        Um grupo junta as mesmas pessoas de sempre: a futebolada de quinta, o padel da empresa. Os jogos do grupo
        aparecem a todos os membros.
      </Muted>
      {error ? <Notice tone="danger" text={error} /> : null}
      {groups === null ? (
        <Muted>A carregar…</Muted>
      ) : groups.length === 0 ? (
        <Card style={{ alignItems: "center" }}>
          <Text style={s.emptyTitle}>Ainda não estás em nenhum grupo.</Text>
          <Muted>Cria um, ou entra pelo link de convite que te enviaram.</Muted>
        </Card>
      ) : (
        groups.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => router.push(`/groups/${g.id}`)}
            accessibilityRole="link"
            style={({ pressed }) => [s.row, pressed ? { borderColor: c.brand } : null]}
          >
            <View style={s.icon}>
              <Text style={{ fontSize: 24 }}>{SPORTS[g.sport]?.emoji ?? "🏅"}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle} numberOfLines={2}>
                {g.name}
              </Text>
              <Muted>
                {SPORTS[g.sport]?.label ?? g.sport} · {g.memberCount} {g.memberCount === 1 ? "membro" : "membros"}
              </Muted>
            </View>
            {g.role === "admin" ? <Badge label="Admin" tone="brand" /> : null}
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );

  return (
    <Screen>
      <Text style={s.title} accessibilityRole="header">
        Os meus grupos
      </Text>
      <Columns
        main={list}
        side={
          <View style={{ gap: 16 }}>
            <Card>
              <CardTitle>Criar grupo</CardTitle>
              <View style={{ gap: 12 }}>
                <Field label="Nome do grupo" placeholder="Ex.: Futebolada de quinta" value={name} onChangeText={setName} />
                <View style={{ gap: 6 }}>
                  <Text style={s.label}>Desporto</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {SPORT_KEYS.map((k) => {
                      const active = sport === k;
                      return (
                        <Pressable
                          key={k}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setSport(k)}
                          style={[s.chip, active ? { backgroundColor: c.brandSoft, borderColor: c.brand } : null]}
                        >
                          <Text style={{ color: active ? c.brandStrong : c.ink, fontWeight: "600" }}>
                            {SPORTS[k].emoji} {SPORTS[k].label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                {createError ? <Notice tone="danger" text={createError} /> : null}
                <Button label="Criar grupo" loading={creating} disabled={name.trim().length < 2} onPress={() => void onCreate()} />
                <Muted>Ficas como admin. Depois partilha o link de convite.</Muted>
              </View>
            </Card>
            <Card>
              <CardTitle>Entrar num grupo</CardTitle>
              <View style={{ gap: 12 }}>
                <Field
                  label="Link de convite"
                  placeholder="https://…/g/…"
                  value={invite}
                  onChangeText={setInvite}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {inviteError ? <Notice tone="danger" text={inviteError} /> : null}
                <Button label="Abrir convite" variant="secondary" disabled={!invite.trim()} onPress={onOpenInvite} />
              </View>
            </Card>
          </View>
        }
      />
    </Screen>
  );
}

const styles = (c: Palette) => ({
  title: { fontSize: 28, fontWeight: "800" as const, color: c.ink },
  label: { fontSize: 14, fontWeight: "600" as const, color: c.ink },
  emptyTitle: { fontWeight: "700" as const, color: c.ink, fontSize: 16 },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: 14,
    paddingRight: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rowTitle: { fontSize: 16, fontWeight: "700" as const, color: c.ink, flexShrink: 1 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  chevron: { color: c.muted, fontSize: 26, fontWeight: "300" as const },
});
