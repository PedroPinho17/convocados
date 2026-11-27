/**
 * Prompt e limpeza da crónica do jogo (pt-PT, estilo WhatsApp, ~80 palavras).
 */

export type MatchSummaryInput = {
  title: string;
  sport: string;
  location: string;
  scoreA: number;
  scoreB: number;
  teamA: { name: string; avgRating: number | null }[];
  teamB: { name: string; avgRating: number | null }[];
};

export const MATCH_SUMMARY_SYSTEM = `És o cronista do Convocados, uma app de jogos amadores em Portugal.
Escreve UMA crónica curta do jogo em português de Portugal (pt-PT), tom leve e divertido, pronta a colar no WhatsApp.
Regras:
- No máximo 80 palavras.
- Sem emails, sem ids, sem hashtags, sem emojis em excesso (no máximo 1–2).
- Menciona o resultado e destaca 1–2 jogadores se fizer sentido (pelas notas, se houver).
- Responde SÓ com o texto da crónica, sem aspas nem título.`;

export function buildMatchSummaryUserPrompt(input: MatchSummaryInput): string {
  const line = (p: { name: string; avgRating: number | null }) =>
    p.avgRating == null ? p.name : `${p.name} (nota ${p.avgRating.toFixed(1)})`;
  return [
    `Jogo: ${input.title} (${input.sport}) em ${input.location}.`,
    `Resultado: Equipa A ${input.scoreA}–${input.scoreB} Equipa B.`,
    `Equipa A: ${input.teamA.map(line).join(', ') || '—'}.`,
    `Equipa B: ${input.teamB.map(line).join(', ') || '—'}.`,
  ].join('\n');
}

/** Corta texto longo e remove aspas envolventes. */
export function cleanMatchSummary(raw: string): string {
  let text = raw.trim().replace(/^["«]|["»]$/g, '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 90) {
    text = `${words.slice(0, 80).join(' ')}…`;
  }
  return text.slice(0, 800);
}
