import { useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import type { GameDetailDto } from "@convocados/shared";
import { ApiError, generateMatchSummary, setGameResult } from "../lib/api";
import { Button, Card, CardTitle, Field, Muted, Notice } from "./ui";
import { useThemedStyles, type Palette } from "../lib/theme";

type Props = {
  game: GameDetailDto;
  isOrganizer: boolean;
  onChange: (game: GameDetailDto) => void;
};

export function GameResultCard({ game, isOrganizer, onChange }: Props) {
  const s = useThemedStyles(styles);
  const [openedAt] = useState(() => Date.now());
  const started = new Date(game.startsAt).getTime() <= openedAt;
  const hasResult = game.scoreA != null && game.scoreB != null;
  const [scoreA, setScoreA] = useState(String(game.scoreA ?? ""));
  const [scoreB, setScoreB] = useState(String(game.scoreB ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (game.status === "cancelled") return null;
  if (!isOrganizer && !hasResult && !game.summary) return null;

  async function save() {
    setError(null);
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setError("Indica o resultado com números inteiros ≥ 0.");
      return;
    }
    setPending(true);
    try {
      onChange(await setGameResult(game.id, { scoreA: a, scoreB: b }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar.");
    } finally {
      setPending(false);
    }
  }

  async function summary() {
    setError(null);
    setPending(true);
    try {
      const res = await generateMatchSummary(game.id);
      if (res.ok) onChange({ ...game, summary: res.summary });
      else setError(res.summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar a crónica.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardTitle>Resultado</CardTitle>
      {hasResult ? (
        <Text style={s.score}>
          {game.scoreA} – {game.scoreB}
        </Text>
      ) : isOrganizer && started ? (
        <Muted>Regista o marcador das equipas A e B.</Muted>
      ) : null}

      {isOrganizer && started ? (
        <View style={s.form}>
          <Field label="Equipa A" value={scoreA} onChangeText={setScoreA} keyboardType="number-pad" />
          <Field label="Equipa B" value={scoreB} onChangeText={setScoreB} keyboardType="number-pad" />
          <Button
            label={pending ? "A guardar…" : hasResult ? "Atualizar resultado" : "Guardar resultado"}
            onPress={() => void save()}
            disabled={pending}
            loading={pending}
          />
        </View>
      ) : null}

      {error ? <Notice tone="danger" text={error} /> : null}

      {hasResult ? (
        <View style={s.summaryBlock}>
          <Text style={s.subTitle}>Crónica do jogo</Text>
          {game.summary ? <Text style={s.summary}>{game.summary}</Text> : <Muted>Ainda sem crónica.</Muted>}
          {isOrganizer ? (
            <Button
              size="sm"
              variant="secondary"
              label={pending ? "A gerar…" : game.summary ? "Gerar outra vez" : "Gerar crónica (IA)"}
              disabled={pending}
              onPress={() => void summary()}
            />
          ) : null}
          {game.summary ? (
            <View style={s.row}>
              <Button
                size="sm"
                variant="ghost"
                label="Copiar / Partilhar"
                onPress={() => void Share.share({ message: game.summary! })}
              />
              <Button
                size="sm"
                variant="ghost"
                label="WhatsApp"
                onPress={() =>
                  void Linking.openURL(
                    `https://wa.me/?text=${encodeURIComponent(game.summary!)}`,
                  )
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = (c: Palette) => ({
  score: { fontSize: 28, fontWeight: "800" as const, color: c.ink },
  form: { gap: 10 },
  summaryBlock: { gap: 10, marginTop: 4 },
  subTitle: { fontSize: 15, fontWeight: "700" as const, color: c.ink },
  summary: { color: c.ink, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
});
