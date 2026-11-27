import { Text, View } from "react-native";
import {
  PREFERRED_FOOT_LABELS,
  PREFERRED_POSITION_LABELS,
  type PlayerProfileDto,
} from "@convocados/shared";
import { Badge, Card, CardTitle, Muted } from "./ui";
import { useThemedStyles, type Palette } from "../lib/theme";

function formatGameDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Vista só de leitura do perfil (próprio ou público). */
export function PlayerProfileView({ profile }: { profile: PlayerProfileDto }) {
  const s = useThemedStyles(styles);
  const { stats } = profile;
  const position = profile.preferredPosition
    ? PREFERRED_POSITION_LABELS[profile.preferredPosition]
    : null;
  const foot = profile.preferredFoot
    ? PREFERRED_FOOT_LABELS[profile.preferredFoot]
    : null;

  return (
    <View style={s.wrap}>
      <Card>
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.name} accessibilityRole="header">
              {profile.displayName}
            </Text>
            <View style={s.badges}>
              {position ? <Badge tone="brand" label={position} /> : null}
              {foot ? <Badge label={`Pé ${foot.toLowerCase()}`} /> : null}
              {profile.city ? <Badge label={profile.city} /> : null}
            </View>
          </View>
        </View>
        {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Estatísticas</CardTitle>
        <View style={s.stats}>
          <View style={s.stat}>
            <Muted>Jogos</Muted>
            <Text style={s.statValue}>{stats.gamesPlayed}</Text>
          </View>
          <View style={s.stat}>
            <Muted>Organizados</Muted>
            <Text style={s.statValue}>{stats.gamesOrganized}</Text>
          </View>
          <View style={s.stat}>
            <Muted>Média</Muted>
            <Text style={s.statValue}>
              {stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
            </Text>
          </View>
          <View style={s.stat}>
            <Muted>Avaliações</Muted>
            <Text style={s.statValue}>{stats.ratingsCount}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <CardTitle>Últimos jogos</CardTitle>
        {stats.recentGames.length === 0 ? (
          <Muted>Ainda sem jogos concluídos.</Muted>
        ) : (
          stats.recentGames.map((g, i) => (
            <View key={g.id} style={[s.gameRow, i > 0 ? s.gameBorder : null]}>
              <Text style={s.gameVenue}>{g.venueName}</Text>
              <Muted>{formatGameDate(g.startsAt)}</Muted>
              {g.result ? <Badge label={g.result} /> : null}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = (c: Palette) => ({
  wrap: { gap: 16 },
  header: { flexDirection: "row" as const, gap: 14, alignItems: "center" as const },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: { color: c.brandStrong, fontWeight: "800" as const, fontSize: 22 },
  name: { fontSize: 24, fontWeight: "800" as const, color: c.ink },
  badges: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
  bio: { color: c.muted, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12 },
  stat: { width: "45%" as const, gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800" as const, color: c.ink },
  gameRow: { gap: 2, paddingVertical: 8 },
  gameBorder: { borderTopWidth: 1, borderTopColor: c.line },
  gameVenue: { fontWeight: "600" as const, color: c.ink, fontSize: 15 },
});
