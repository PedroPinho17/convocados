import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { SPORTS, type GameDto } from "@convocados/shared";
import { radius, usePalette, useThemedStyles, type Palette } from "../lib/theme";
import { Badge } from "./ui";

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", ""),
    day: d.toLocaleDateString("pt-PT", { day: "numeric" }),
    month: d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", ""),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Um jogo na lista: data à esquerda, título, desporto, local e hora à direita.
 * Sem <Link asChild>: o Link juntava os estilos numa lista e o estilo em função
 * (o "pressed") perdia-se, e o cartão ficava sem fundo e em coluna.
 */
export function GameCard({ game, faded, showGroup = true }: { game: GameDto; faded?: boolean; showGroup?: boolean }) {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const { weekday, day, month, time } = dateParts(game.startsAt);
  const cancelled = game.status === "cancelled";
  const dim = cancelled ? { color: c.muted } : null;
  const sport = SPORTS[game.sport];
  return (
    <Pressable
      onPress={() => router.push(`/games/${game.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${game.title}, ${weekday} ${day} ${month} às ${time}, ${game.location}${cancelled ? ", cancelado" : ""}`}
      style={({ pressed }) => [
        s.card,
        faded ? { opacity: 0.7 } : null,
        pressed ? { borderColor: c.brand, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={[s.dateBox, cancelled ? { backgroundColor: c.surface2 } : null]}>
        <Text style={[s.dateSmall, dim]}>{weekday.toUpperCase()}</Text>
        <Text style={[s.dateDay, dim]}>{day}</Text>
        <Text style={[s.dateSmall, dim]}>{month.toUpperCase()}</Text>
      </View>
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title} numberOfLines={2}>
            {game.title}
          </Text>
          {cancelled ? <Badge label="Cancelado" tone="danger" /> : null}
        </View>
        <Text style={s.meta} numberOfLines={1}>
          {sport ? `${sport.emoji} ${sport.label}` : game.sport}
          {showGroup && game.groupName ? ` · ${game.groupName}` : ""}
        </Text>
        <Text style={s.meta} numberOfLines={2}>
          📍 {game.location}
        </Text>
        <Text style={s.time}>
          {time} · {game.slots} vagas
        </Text>
      </View>
      <Text style={s.chevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = (c: Palette) => ({
  card: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: c.surface,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
  },
  dateBox: {
    width: 60,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    alignSelf: "stretch" as const,
    justifyContent: "center" as const,
  },
  dateSmall: { fontSize: 11, fontWeight: "700" as const, color: c.brandStrong, letterSpacing: 0.4 },
  dateDay: { fontSize: 24, fontWeight: "800" as const, color: c.brandStrong, lineHeight: 28 },
  body: { flex: 1, gap: 3, minWidth: 0 },
  titleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flexWrap: "wrap" as const },
  title: { fontSize: 16, fontWeight: "700" as const, color: c.ink, flexShrink: 1 },
  meta: { color: c.muted, fontSize: 13.5 },
  time: { color: c.ink, fontSize: 13.5, fontWeight: "600" as const },
  chevron: { color: c.muted, fontSize: 26, fontWeight: "300" as const, marginLeft: 2 },
});
