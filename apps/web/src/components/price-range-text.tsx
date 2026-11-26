import { shareSummary, type GameDto } from "@convocados/shared";

type Props = Pick<GameDto, "totalPriceCents" | "slots"> & { confirmedCount?: number };

/** "Com 7 confirmados, cada um paga 4,29 €; se encher, 3,00 €." */
export function PriceRangeText({ totalPriceCents, slots, confirmedCount }: Props) {
  return <>{shareSummary({ totalPriceCents, slots }, confirmedCount)}</>;
}
