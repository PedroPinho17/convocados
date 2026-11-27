import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SPORTS, type GameInviteDto } from "@convocados/shared";
import { ApiError, getInvite, getToken } from "../../lib/api";
import { Button, Card, Muted, Notice, Screen } from "../../components/ui";
import { radius, useThemedStyles, type Palette } from "../../lib/theme";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

/**
 * Deep link / App Link do convite de um jogo (`https://…/i/<código>` ou `convocados://i/<código>`).
 * Com sessão, abre o detalhe do jogo com o código do convite; sem sessão, pede login.
 */
export default function GameInviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const s = useThemedStyles(styles);
  const [invite, setInvite] = useState<GameInviteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInvite(code)
      .then(async (preview) => {
        if (cancelled) return;
        setInvite(preview);
        const token = await getToken();
        if (token) {
          router.replace({
            pathname: "/games/[id]",
            params: { id: preview.id, invite: code },
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Convite inválido.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onOpen() {
    setOpening(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace({ pathname: "/login", params: { next: `/i/${code}` } });
        return;
      }
      if (!invite) return;
      router.replace({
        pathname: "/games/[id]",
        params: { id: invite.id, invite: code },
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice tone="danger" text={error} /> : null}
      {invite ? (
        <Card style={{ alignItems: "center", gap: 12 }}>
          <View style={s.icon}>
            <Text style={{ fontSize: 34 }}>{SPORTS[invite.sport]?.emoji ?? "🏅"}</Text>
          </View>
          <Muted>Foste convocado</Muted>
          <Text style={s.title}>{invite.title}</Text>
          <Muted>{formatWhen(invite.startsAt)}</Muted>
          <Muted>
            {SPORTS[invite.sport]?.label ?? invite.sport} · {invite.location}
          </Muted>
          <Muted>
            {invite.confirmedCount}/{invite.slots} confirmados
            {invite.waitingCount > 0 ? ` · ${invite.waitingCount} em espera` : ""}
          </Muted>
          <Button
            label="Abrir convite"
            loading={opening}
            onPress={() => void onOpen()}
            style={{ alignSelf: "stretch" }}
          />
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
