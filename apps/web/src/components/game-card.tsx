import Link from "next/link";
import { SPORTS, type GameDto, type Sport } from "@convocados/shared";
import { dateParts, formatGameDate } from "@/lib/format";
import { Badge, cn } from "@/components/ui";

/** Cartão de um jogo: o dia em destaque, desporto, grupo e local. O cartão todo é clicável. */
export function GameCard({ game, faded }: { game: GameDto; faded?: boolean }) {
  const { day, month, weekday } = dateParts(game.startsAt);
  const cancelled = game.status === "cancelled";
  const sport = SPORTS[game.sport as Sport] ?? SPORTS.other;
  return (
    <li
      className={cn(
        "group relative flex gap-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:rounded-3xl",
        faded && "opacity-75",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl py-2 ring-1",
          cancelled
            ? "bg-surface-2 text-muted ring-ink/5"
            : "bg-surface-2 text-ink ring-ink/5",
        )}
      >
        <span className="text-[0.7rem] font-semibold uppercase text-muted">
          {weekday.replace(".", "")}
        </span>
        <span className="text-xl font-bold leading-none">{day}</span>
        <span className="text-[0.7rem] uppercase text-muted">{month.replace(".", "")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/games/${game.id}`}
            className="min-w-0 line-clamp-2 font-semibold wrap-break-word after:absolute after:inset-0 after:rounded-2xl sm:after:rounded-3xl"
          >
            {game.title}
          </Link>
          {cancelled ? <Badge tone="danger">Cancelado</Badge> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">
          <span aria-label={sport.label}>{sport.emoji}</span> {sport.label}
          {game.groupName ? <> · {game.groupName}</> : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{game.location}</p>
        <p className="mt-0.5 text-sm text-muted">
          {formatGameDate(game.startsAt)} · {game.slots} vagas
        </p>
      </div>
    </li>
  );
}
