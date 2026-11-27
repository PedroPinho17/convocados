"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SPORTS, type GroupInviteDto, type UserDto } from "@convocados/shared";
import { ApiError, getGroupInvite, getMe, joinGroup } from "@/lib/api";
import { AuthShell, Button, Notice } from "@/components/ui";

/** Convite para um grupo: o que é, quantos membros tem, e entrar (com ou sem conta). */
export function GroupInviteClient() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<GroupInviteDto | null>(null);
  const [me, setMe] = useState<UserDto | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getGroupInvite(code)
      .then(setInvite)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Convite inválido."));
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, [code]);

  async function onJoin() {
    setError(null);
    setPending(true);
    try {
      const group = await joinGroup(code);
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar no grupo.");
      setPending(false);
    }
  }

  if (!invite) {
    return (
      <AuthShell title="Convite para um grupo">
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : (
          <p className="text-center text-muted">A carregar…</p>
        )}
      </AuthShell>
    );
  }

  const sport = SPORTS[invite.sport];
  return (
    <AuthShell title={invite.name} subtitle="Foste convidado para este grupo">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-brand-soft px-4 py-3 text-brand-strong">
          <span aria-hidden="true" className="text-2xl">
            {sport.emoji}
          </span>
          <span className="font-semibold">
            {sport.label} · {invite.memberCount} {invite.memberCount === 1 ? "membro" : "membros"}
          </span>
        </div>
        <p className="text-center text-sm text-muted">
          Os membros veem os jogos do grupo e recebem um aviso quando há um jogo novo.
        </p>
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
        {me === undefined ? null : me ? (
          <Button onClick={() => void onJoin()} disabled={pending} className="w-full">
            {pending ? "A entrar…" : "Entrar no grupo"}
          </Button>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/g/${code}`)}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-4 font-semibold text-brand-ink hover:bg-brand-strong"
          >
            Entra ou cria conta para entrar
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
