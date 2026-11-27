"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatEuros,
  initials,
  sharePerPlayerCents,
  type GameDetailDto,
  type UserDto,
} from "@convocados/shared";
import { ApiError, confirmGame, leaveGame, setPaid } from "@/lib/api";
import { PriceRangeText } from "@/components/price-range-text";
import { Badge, Button, Card, Notice } from "@/components/ui";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
  /** Para onde voltar depois do login (só usado sem sessão). */
  loginNext: string;
  /** Na página do convite: o código dá acesso para confirmar/desistir antes de estar no jogo. */
  inviteCode?: string;
  onChange: (game: GameDetailDto) => void;
};

/** Vagas, preço por pessoa, confirmar/desistir e as listas. Usado no convite e no detalhe do jogo. */
export function GameParticipation({ game, me, loginNext, inviteCode, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Hora fixada ao abrir a página (o render tem de ser puro); a API valida de novo ao confirmar.
  const [openedAt] = useState(() => Date.now());

  const confirmed = game.participations.filter((p) => p.status === "confirmed");
  const waiting = game.participations.filter((p) => p.status === "waiting");
  const mine = me ? game.participations.find((p) => p.userId === me.id) : undefined;
  const myQueuePlace = mine?.status === "waiting" ? waiting.findIndex((p) => p.id === mine.id) + 1 : 0;
  const slotsFull = game.confirmedCount >= game.slots;
  const full = slotsFull && game.waitingCount >= game.subs;
  const started = new Date(game.startsAt).getTime() <= openedAt;
  const cancelled = game.status === "cancelled";
  const isOrganizer = me?.id === game.organizerId;
  const fill = Math.min(100, Math.round((game.confirmedCount / Math.max(1, game.slots)) * 100));

  const shareCents =
    game.totalPriceCents > 0 && confirmed.length > 0
      ? sharePerPlayerCents(game.totalPriceCents, confirmed.length)
      : 0;
  const unpaidCount = confirmed.filter((p) => !p.paid).length;
  const outstandingCents = shareCents * unpaidCount;

  async function run(
    action: (id: string, inviteCode?: string) => Promise<GameDetailDto>,
    fallback: string,
  ) {
    setError(null);
    setPending(true);
    try {
      onChange(await (inviteCode ? action(game.id, inviteCode) : action(game.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setPending(false);
    }
  }

  async function togglePaid(userId: string, paid: boolean) {
    setError(null);
    setPending(true);
    try {
      onChange(await setPaid(game.id, userId, paid));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o pagamento.");
    } finally {
      setPending(false);
    }
  }

  const confirmLabel = cancelled
    ? "Jogo cancelado"
    : started
      ? "Jogo já começou"
      : full
        ? "Jogo cheio"
        : slotsFull
          ? "Entrar na lista de espera"
          : "Confirmar";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg">
                <strong className="text-2xl font-bold">
                  {game.confirmedCount}/{game.slots}
                </strong>{" "}
                confirmados
              </p>
              {game.subs > 0 ? (
                <span className="text-sm text-terracotta">
                  {game.waitingCount}/{game.subs} em lista de espera
                </span>
              ) : null}
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line"
              role="progressbar"
              aria-label="Vagas preenchidas"
              aria-valuemin={0}
              aria-valuemax={game.slots}
              aria-valuenow={game.confirmedCount}
            >
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${fill}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted">
            <p>
              <PriceRangeText {...game} confirmedCount={game.confirmedCount} />
            </p>
            {game.totalPriceCents > 0 && confirmed.length > 0 ? (
              <p>
                Pagamentos: {confirmed.length - unpaidCount}/{confirmed.length} · falta{" "}
                <strong className="text-ink">{formatEuros(outstandingCents)}</strong>
              </p>
            ) : null}
          </div>

          {!me ? (
            <p className="rounded-xl bg-brand-soft px-4 py-3 text-brand-strong">
              <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="font-semibold underline">
                Entra ou cria conta
              </Link>{" "}
              para confirmar presença.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {mine ? (
                <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  {mine.status === "confirmed" ? (
                    <>
                      Estás <strong>confirmado</strong>
                      {game.totalPriceCents > 0 ? (mine.paid ? " · pago." : " · pagamento em falta.") : "."}
                    </>
                  ) : (
                    <>
                      Estás em <strong>lista de espera</strong> ({myQueuePlace}.º). Entras se alguém desistir.
                    </>
                  )}
                </p>
              ) : null}
              {!mine ? (
                <Button
                  key="confirm"
                  disabled={pending || full || started || cancelled}
                  onClick={() => run(confirmGame, "Não foi possível confirmar.")}
                  className="w-full sm:w-auto sm:self-start sm:px-8"
                >
                  {confirmLabel}
                </Button>
              ) : (
                <Button
                  key="leave"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(leaveGame, "Não foi possível desistir.")}
                  className="w-full sm:w-auto sm:self-start"
                >
                  Desistir
                </Button>
              )}
              {error ? (
                <Notice tone="danger" role="alert">
                  {error}
                </Notice>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Confirmados</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted">Ainda ninguém.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {confirmed.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong"
                  >
                    {initials(p.userName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium wrap-break-word">
                      {i + 1}.{" "}
                      {me ? (
                        <Link
                          href={`/players/${p.userId}`}
                          className="text-brand-strong hover:underline"
                        >
                          {p.userName}
                        </Link>
                      ) : (
                        p.userName
                      )}
                    </span>
                    {game.totalPriceCents > 0 ? (
                      <Badge tone={p.paid ? "ok" : "accent"} className="mt-0.5">
                        {p.paid ? "pago" : "em falta"}
                        {shareCents > 0 ? ` (${formatEuros(shareCents)})` : null}
                      </Badge>
                    ) : null}
                  </span>
                </span>
                {isOrganizer && game.totalPriceCents > 0 ? (
                  <Button
                    size="sm"
                    variant={p.paid ? "ghost" : "secondary"}
                    disabled={pending}
                    onClick={() => togglePaid(p.userId, !p.paid)}
                  >
                    {p.paid ? "Marcar em falta" : "Marcar pago"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {game.subs > 0 ? (
          <div className="mt-5 border-t border-line pt-4">
            <h2 className="mb-2 text-base font-semibold text-terracotta">Lista de espera</h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-muted">Vazia.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {waiting.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="grid size-7 place-items-center rounded-full bg-terracotta-soft text-xs font-semibold text-terracotta">
                      {i + 1}
                    </span>
                    {me ? (
                      <Link
                        href={`/players/${p.userId}`}
                        className="font-medium text-brand-strong hover:underline"
                      >
                        {p.userName}
                      </Link>
                    ) : (
                      p.userName
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
