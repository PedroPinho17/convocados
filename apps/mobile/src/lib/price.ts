import { shareSummary, type GameDto } from "@convocados/shared";

/** "Com 7 confirmados, cada um paga 4,29 €; se encher, 3,00 €." */
export function priceRangeText(
  game: Pick<GameDto, "totalPriceCents" | "slots">,
  confirmedCount?: number,
) {
  return shareSummary(game, confirmedCount);
}
