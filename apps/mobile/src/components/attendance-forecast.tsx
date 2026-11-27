import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { AttendanceForecastDto } from "@convocados/shared";
import { ApiError, getAttendanceForecast } from "../lib/api";
import { Card, CardTitle, Muted, Notice } from "./ui";
import { useThemedStyles, type Palette } from "../lib/theme";

type Props = { gameId: string; isOrganizer: boolean; cancelled: boolean };

export function AttendanceForecastCard({ gameId, isOrganizer, cancelled }: Props) {
  const s = useThemedStyles(styles);
  const [data, setData] = useState<AttendanceForecastDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOrganizer || cancelled) return;
    getAttendanceForecast(gameId)
      .then(setData)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro na previsão.");
      });
  }, [gameId, isOrganizer, cancelled]);

  if (!isOrganizer || cancelled) return null;

  return (
    <Card>
      <CardTitle>Previsão de comparecimento</CardTitle>
      {error ? <Notice tone="danger" text={error} /> : null}
      {!error && !data ? <Muted>A calcular…</Muted> : null}
      {data ? (
        <View style={s.wrap}>
          <Text style={s.line}>
            Esperados{" "}
            <Text style={s.strong}>
              {data.expectedPlayers.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}
            </Text>{" "}
            de {data.neededPlayers} vagas.
          </Text>
          {data.riskOfNotFilling ? (
            <Notice tone="warn" text="Risco de não encher o jogo." />
          ) : (
            <Notice tone="ok" text="Deve encher, segundo o histórico." />
          )}
          {data.players.map((p) => (
            <View key={p.userId} style={s.row}>
              <Text style={s.name} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={s.pct}>{Math.round(p.probability * 100)}%</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = (c: Palette) => ({
  wrap: { gap: 10 },
  line: { color: c.ink, fontSize: 15 },
  strong: { fontWeight: "800" as const },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  name: { color: c.ink, flexShrink: 1, fontSize: 14 },
  pct: { color: c.muted, fontSize: 14 },
});
