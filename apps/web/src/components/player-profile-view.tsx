import {
  PREFERRED_FOOT_LABELS,
  PREFERRED_POSITION_LABELS,
  type PlayerProfileDto,
} from "@convocados/shared";
import { Badge, Card, CardTitle } from "@/components/ui";

function formatGameDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Vista só de leitura do perfil (próprio ou público). */
export function PlayerProfileView({ profile }: { profile: PlayerProfileDto }) {
  const { stats } = profile;
  const position = profile.preferredPosition
    ? PREFERRED_POSITION_LABELS[profile.preferredPosition]
    : null;
  const foot = profile.preferredFoot
    ? PREFERRED_FOOT_LABELS[profile.preferredFoot]
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-soft text-xl font-bold text-brand-strong"
          >
            {profile.initials}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight wrap-break-word sm:text-3xl">
              {profile.displayName}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {position ? <Badge tone="brand">{position}</Badge> : null}
              {foot ? <Badge>Pé {foot.toLowerCase()}</Badge> : null}
              {profile.city ? <Badge tone="neutral">{profile.city}</Badge> : null}
            </div>
          </div>
        </div>
        {profile.bio ? <p className="mt-4 text-sm text-muted whitespace-pre-wrap">{profile.bio}</p> : null}
      </Card>

      <Card>
        <CardTitle>Estatísticas</CardTitle>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Jogos</dt>
            <dd className="text-xl font-bold">{stats.gamesPlayed}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Organizados</dt>
            <dd className="text-xl font-bold">{stats.gamesOrganized}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Média</dt>
            <dd className="text-xl font-bold">
              {stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Avaliações</dt>
            <dd className="text-xl font-bold">{stats.ratingsCount}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle>Últimos jogos</CardTitle>
        {stats.recentGames.length === 0 ? (
          <p className="text-sm text-muted">Ainda sem jogos concluídos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {stats.recentGames.map((g) => (
              <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block font-medium wrap-break-word">{g.venueName}</span>
                  <span className="text-sm text-muted">{formatGameDate(g.startsAt)}</span>
                </span>
                {g.result ? <Badge>{g.result}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
