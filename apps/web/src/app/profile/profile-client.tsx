"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlayerProfileDto } from "@convocados/shared";
import { ApiError, getMyProfile } from "@/lib/api";
import { AppNav } from "@/components/app-nav";
import { PlayerProfileView } from "@/components/player-profile-view";
import { ProfileForm } from "@/components/profile-form";
import { Card, CardTitle, Page } from "@/components/ui";

/** Cliente: sessão e API só no browser. */
export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?next=%2Fprofile");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar o perfil.");
      });
  }, [router]);

  const header = <AppNav />;

  if (error) {
    return (
      <>
        {header}
        <Page width="narrow">
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
        <div className="mb-2 flex justify-end">
          <Link href="/account" className="text-sm font-medium text-brand-strong hover:underline">
            Conta e privacidade
          </Link>
        </div>

        <PlayerProfileView profile={profile} />

        <Card>
          <CardTitle>Editar perfil</CardTitle>
          <ProfileForm profile={profile} onSaved={setProfile} />
        </Card>
      </Page>
    </>
  );
}
