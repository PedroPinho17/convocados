import Link from "next/link";
import type { GameInviteDto } from "@convocados/shared";
import { PriceRangeText } from "@/components/price-range-text";
import { Card } from "@/components/ui";

type Props = {
  invite: GameInviteDto;
  /** Para onde voltar depois do login. */
  loginNext: string;
};

/**
 * O convite visto sem sessão: vagas, preço e quem já vai. Vem do resumo público da API,
 * sem pagamentos nem ids; para confirmar é preciso entrar (e aí vê-se o detalhe completo).
 */
export function InvitePreview({ invite, loginNext }: Props) {
  const confirmed = invite.players.filter((p) => p.status === "confirmed");
  const waiting = invite.players.filter((p) => p.status === "waiting");
  const fill = Math.min(100, Math.round((invite.confirmedCount / Math.max(1, invite.slots)) * 100));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg">
                <strong className="text-2xl font-bold">
                  {invite.confirmedCount}/{invite.slots}
                </strong>{" "}
                confirmados
              </p>
              {invite.subs > 0 ? (
                <span className="text-sm text-muted">
                  {invite.waitingCount}/{invite.subs} em lista de espera
                </span>
              ) : null}
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line"
              role="progressbar"
              aria-label="Vagas preenchidas"
              aria-valuemin={0}
              aria-valuemax={invite.slots}
              aria-valuenow={invite.confirmedCount}
            >
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${fill}%` }} />
            </div>
          </div>

          <p className="text-sm text-muted">
            <PriceRangeText
              totalPriceCents={invite.totalPriceCents}
              slots={invite.slots}
              confirmedCount={invite.confirmedCount}
            />
          </p>

          <p className="rounded-xl bg-brand-soft px-4 py-3 text-brand-strong">
            <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="font-semibold underline">
              Entra ou cria conta
            </Link>{" "}
            para confirmar presença.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Confirmados</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted">Ainda ninguém.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {confirmed.map((p, i) => (
              <li key={`${i}-${p.name}`} className="font-medium wrap-break-word">
                {i + 1}. {p.name}
              </li>
            ))}
          </ol>
        )}

        {invite.subs > 0 ? (
          <div className="mt-5 border-t border-line pt-4">
            <h2 className="mb-2 text-base font-semibold">Lista de espera</h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-muted">Vazia.</p>
            ) : (
              <ol className="flex flex-col gap-1.5 text-sm">
                {waiting.map((p, i) => (
                  <li key={`${i}-${p.name}`}>
                    {i + 1}. {p.name}
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
