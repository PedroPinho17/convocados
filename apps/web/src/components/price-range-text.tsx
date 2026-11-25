import { formatEuros, priceRangeCents, type GameDto } from "@convocados/shared";

type Props = Pick<GameDto, "totalPriceCents" | "slots" | "subs">;

/** "Cada um paga entre 2,50 € (se vierem 12) e 3,00 € (se vierem 10)". */
export function PriceRangeText({ totalPriceCents, slots, subs }: Props) {
  if (totalPriceCents <= 0) return <>Jogo grátis.</>;
  const { min, max } = priceRangeCents({ totalPriceCents, slots, subs });
  if (subs <= 0 || min === max) {
    return (
      <>
        Cada um paga {formatEuros(max)} (se vierem {slots}).
      </>
    );
  }
  return (
    <>
      Cada um paga entre {formatEuros(min)} (se vierem {slots + subs}) e {formatEuros(max)} (se
      vierem {slots}).
    </>
  );
}
