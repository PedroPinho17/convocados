import { formatEuros, priceRangeCents, type GameDto } from "@convocados/shared";

/** "Cada um paga entre 2,50 € (se vierem 12) e 3,00 € (se vierem 10)". */
export function priceRangeText(game: Pick<GameDto, "totalPriceCents" | "slots" | "subs">) {
  if (game.totalPriceCents <= 0) return "Jogo grátis.";
  const { min, max } = priceRangeCents(game);
  if (game.subs <= 0 || min === max) {
    return `Cada um paga ${formatEuros(max)} (se vierem ${game.slots}).`;
  }
  return `Cada um paga entre ${formatEuros(min)} (se vierem ${game.slots + game.subs}) e ${formatEuros(max)} (se vierem ${game.slots}).`;
}
