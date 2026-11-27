import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SPORTS, type GroupInviteDto } from "@convocados/shared";
import { ApiError, getGroupInvite, joinGroup } from "../../lib/api";
import { Button, Card, Muted, Notice, Screen } from "../../components/ui";
import { radius, useThemedStyles, type Palette } from "../../lib/theme";

/** Convite de um grupo (o mesmo que /g/<código> na web): ver o grupo e entrar. */
export default function GroupInviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const s = useThemedStyles(styles);
  const [preview, setPreview] = useState<GroupInviteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGroupInvite(code)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Convite inválido.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onJoin() {
    setJoining(true);
    setError(null);
    try {
      const g = await joinGroup(code);
      router.replace(`/groups/${g.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar no grupo.");
      setJoining(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice tone="danger" text={error} /> : null}
      {preview ? (
        <Card style={{ alignItems: "center", gap: 12 }}>
          <View style={s.icon}>
            <Text style={{ fontSize: 34 }}>{SPORTS[preview.sport]?.emoji ?? "🏅"}</Text>
          </View>
          <Muted>Convite para o grupo</Muted>
          <Text style={s.title}>{preview.name}</Text>
          <Muted>
            {SPORTS[preview.sport]?.label ?? preview.sport} · {preview.memberCount}{" "}
            {preview.memberCount === 1 ? "membro" : "membros"}
          </Muted>
          <Button label="Entrar no grupo" loading={joining} onPress={() => void onJoin()} style={{ alignSelf: "stretch" }} />
        </Card>
      ) : !error ? (
        <Muted>A carregar…</Muted>
      ) : null}
    </Screen>
  );
}

const styles = (c: Palette) => ({
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: { fontSize: 24, fontWeight: "800" as const, color: c.ink, textAlign: "center" as const },
});
