"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SPORTS, type CreateGameInput, type GroupDetailDto, type UserDto } from "@convocados/shared";
import { ApiError, createGame, getGroup, getMe, leaveGroup, removeGroupMember } from "@/lib/api";
import { AppNav } from "@/components/app-nav";
import { GameCard } from "@/components/game-card";
import { NewGame } from "@/components/new-game";
import { GroupInvite } from "@/components/group-invite";
import { BackLink, Badge, Button, Card, CardTitle, Notice, Page } from "@/components/ui";

export function GroupDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetailDto | null>(null);
  const [me, setMe] = useState<UserDto | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Depois de uma ação (criar jogo, remover membro): volta a ler o grupo. */
  const load = useCallback(async () => {
    setGroup(await getGroup(id));
    setLoadedAt(Date.now());
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getGroup(id), getMe()])
      .then(([g, user]) => {
        if (cancelled) return;
        setGroup(g);
        setMe(user);
        setLoadedAt(Date.now());
      })
      .catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/groups/${id}`)}`);
        return;
      }
      setError(
        err instanceof ApiError && err.status === 403
          ? "Não és membro deste grupo. Pede o link de convite a um membro."
          : err instanceof ApiError
            ? err.message
            : "Erro ao carregar o grupo.",
      );
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function onCreate(input: CreateGameInput) {
    await createGame({ ...input, groupId: id });
    await load();
  }

  async function onRemove(userId: string, name: string) {
    if (!window.confirm(`Remover ${name} do grupo?`)) return;
    setActionError(null);
    setPending(true);
    try {
      await removeGroupMember(id, userId);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    } finally {
      setPending(false);
    }
  }

  async function onLeave() {
    if (!window.confirm("Sair do grupo? Deixas de ver os jogos do grupo.")) return;
    setActionError(null);
    setPending(true);
    try {
      await leaveGroup(id);
      router.push("/groups");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível sair do grupo.");
      setPending(false);
    }
  }

  if (error || !group) {
    return (
      <>
        <AppNav />
        <Page>
          <BackLink href="/groups" label="Voltar aos grupos" />
          {error ? (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          ) : (
            <p className="text-muted">A carregar…</p>
          )}
        </Page>
      </>
    );
  }

  const sport = SPORTS[group.sport];
  const isAdmin = group.role === "admin";
  const upcoming = group.games.filter((g) => new Date(g.startsAt).getTime() >= loadedAt);
  const past = group.games.filter((g) => new Date(g.startsAt).getTime() < loadedAt);

  return (
    <>
      <AppNav />
      <Page>
        <BackLink href="/groups" label="Voltar aos grupos" />

        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-3xl">
            {sport.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold wrap-break-word tracking-tight sm:text-3xl">{group.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {sport.label} · {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
              {isAdmin ? <Badge tone="brand">És admin</Badge> : null}
            </p>
          </div>
        </section>

        {actionError ? (
          <Notice tone="danger" role="alert">
            {actionError}
          </Notice>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="group-upcoming" className="flex flex-col gap-3">
              <h2 id="group-upcoming" className="text-sm font-semibold uppercase tracking-wide text-muted">
                Próximos jogos
              </h2>
              {upcoming.length === 0 ? (
                <Card className="text-center">
                  <p className="font-medium">Ainda não há jogos marcados.</p>
                  <p className="mt-1 text-sm text-muted">Cria o próximo: todos os membros são avisados.</p>
                </Card>
              ) : (
                <ul className="flex flex-col gap-3">
                  {upcoming.map((g) => (
                    <GameCard key={g.id} game={g} />
                  ))}
                </ul>
              )}
            </section>

            <Card>
              <CardTitle>Novo jogo no grupo</CardTitle>
              <NewGame onCreate={onCreate} groups={[group]} groupId={group.id} />
            </Card>

            {past.length > 0 ? (
              <section aria-labelledby="group-past" className="flex flex-col gap-3">
                <h2 id="group-past" className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Anteriores
                </h2>
                <ul className="flex flex-col gap-3">
                  {past.slice(0, 10).map((g) => (
                    <GameCard key={g.id} game={g} faded />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <GroupInvite inviteCode={group.inviteCode} groupName={group.name} />

            <Card>
              <CardTitle>Membros</CardTitle>
              <ul className="flex flex-col divide-y divide-line">
                {group.members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong"
                      >
                        {m.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium wrap-break-word">
                          {m.name}
                          {m.userId === me?.id ? " (tu)" : ""}
                        </span>
                        {m.role === "admin" ? <span className="text-xs text-muted">Admin</span> : null}
                      </span>
                    </span>
                    {isAdmin && m.userId !== me?.id ? (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => void onRemove(m.userId, m.name)}>
                        Remover
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-danger/30">
              <h2 className="text-base font-semibold">Sair do grupo</h2>
              <p className="mt-1 text-sm text-muted">
                Deixas de ver os jogos do grupo. Se fores o único admin, o membro mais antigo passa a admin.
              </p>
              <Button variant="danger" className="mt-3" disabled={pending} onClick={() => void onLeave()}>
                Sair do grupo
              </Button>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}
