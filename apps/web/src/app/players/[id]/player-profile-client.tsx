"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PlayerProfileDto } from "@convocados/shared";
import { ApiError, getPlayerProfile } from "@/lib/api";
import { AppNav } from "@/components/app-nav";
import { PlayerProfileView } from "@/components/player-profile-view";
import { BackLink, Page } from "@/components/ui";

/** Cliente: params e API só no browser (dentro de <Suspense> na page). */
export function PlayerProfileClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<PlayerProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPlayerProfile(id)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/players/${id}`)}`);
          return;
        }
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? "Jogador não encontrado."
              : err.message
            : "Erro ao carregar o perfil.",
        );
      });
  }, [id, router]);

  const header = <AppNav />;

  if (error) {
    return (
      <>
        {header}
        <Page width="narrow">
          <BackLink href="/games" />
          <p className="text-danger" role="alert">
            {error}
          </p>
        </Page>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        {header}
        <Page width="narrow">
          <p className="text-muted">A carregar…</p>
        </Page>
      </>
    );
  }

  return (
    <>
      {header}
      <Page width="narrow">
        <BackLink href="/games" />
        <PlayerProfileView profile={profile} />
      </Page>
    </>
  );
}
