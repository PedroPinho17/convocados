"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPORTS, SPORT_KEYS, type GroupDto, type Sport } from "@convocados/shared";
import { ApiError, createGroup, listGroups } from "@/lib/api";
import { AppNav } from "@/components/app-nav";
import { Badge, Button, Card, CardTitle, Notice, Page, inputClass, labelClass } from "@/components/ui";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("football");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    listGroups()
      .then(setGroups)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?next=%2Fgroups");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar grupos.");
      });
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      const group = await createGroup({ name, sport });
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível criar o grupo.");
      setPending(false);
    }
  }

  return (
    <>
      <AppNav />
      <Page>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Os meus grupos</h1>
          <p className="mt-1 text-muted">
            Um grupo junta as mesmas pessoas de sempre: a futebolada de quinta, o padel da empresa.
            Os jogos do grupo aparecem a todos os membros.
          </p>
        </div>
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section aria-label="Grupos" className="flex min-w-0 flex-col gap-3">
            {groups === null ? (
              <p className="text-muted">A carregar…</p>
            ) : groups.length === 0 ? (
              <Card className="text-center">
                <p className="font-medium">Ainda não estás em nenhum grupo.</p>
                <p className="mt-1 text-sm text-muted">
                  Cria um grupo ao lado, ou pede o link de convite a quem já tem um.
                </p>
              </Card>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <li
                    key={g.id}
                    className="relative flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:rounded-3xl"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl ring-1 ring-ink/5"
                    >
                      {SPORTS[g.sport].emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/groups/${g.id}`}
                        className="block line-clamp-2 font-semibold wrap-break-word after:absolute after:inset-0 after:rounded-2xl"
                      >
                        {g.name}
                      </Link>
                      <p className="line-clamp-2 text-sm text-muted">
                        {SPORTS[g.sport].label} · {g.memberCount} {g.memberCount === 1 ? "membro" : "membros"}
                      </p>
                    </div>
                    {g.role === "admin" ? <Badge tone="brand">Admin</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Card className="lg:sticky lg:top-20">
            <CardTitle>Criar grupo</CardTitle>
            <form onSubmit={onCreate} className="flex flex-col gap-4">
              <label className={labelClass}>
                Nome do grupo
                <input
                  className={inputClass}
                  placeholder="Ex.: Futebolada de quinta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={60}
                />
              </label>
              <label className={labelClass}>
                Desporto
                <select className={inputClass} value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
                  {SPORT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {SPORTS[k].emoji} {SPORTS[k].label}
                    </option>
                  ))}
                </select>
              </label>
              {formError ? (
                <Notice tone="danger" role="alert">
                  {formError}
                </Notice>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? "A criar…" : "Criar grupo"}
              </Button>
              <p className="text-xs text-muted">Ficas como admin. Depois partilha o link de convite.</p>
            </form>
          </Card>
        </div>
      </Page>
    </>
  );
}
