"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserDto } from "@convocados/shared";
import { ApiError, deleteAccount, getMe } from "@/lib/api";
import { leaveToLogin, resetSocket } from "@/lib/socket";
import { PasswordInput } from "@/components/password-input";
import { Button, Card, Notice, Page } from "@/components/ui";
import { AppNav } from "@/components/app-nav";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDto | null>(null);
  const [password, setPassword] = useState("");
  const [sure, setSure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => router.replace("/login?next=%2Faccount"));
  }, [router]);

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await deleteAccount({ password });
      resetSocket();
      leaveToLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível apagar a conta.");
    } finally {
      setPending(false);
    }
  }

  const header = <AppNav />;

  if (!me) {
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Conta</h1>

        <Card>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-bold text-brand-strong"
            >
              {me.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{me.name}</p>
              <p className="truncate text-sm text-muted">{me.email}</p>
            </div>
          </div>
          <Link href="/privacidade" className="mt-4 inline-block text-sm font-medium text-brand-strong hover:underline">
            Política de privacidade
          </Link>
        </Card>

        <Card className="border-danger/30">
          <form onSubmit={onDelete} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-danger">Apagar conta</h2>
              <p className="mt-1 text-sm text-muted">
                Apaga o teu nome, email, avaliações e os jogos que organizaste. Nos jogos dos outros sais
                como numa desistência normal. Não dá para desfazer.
              </p>
            </div>
            <PasswordInput
              placeholder="A tua password"
              aria-label="A tua password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-[var(--danger)]"
                checked={sure}
                onChange={(e) => setSure(e.target.checked)}
              />
              Quero apagar a minha conta
            </label>
            {error && (
              <Notice tone="danger" role="alert">
                {error}
              </Notice>
            )}
            <Button
              type="submit"
              disabled={pending || !sure}
              className="bg-danger text-white hover:bg-danger hover:opacity-90"
            >
              {pending ? "A apagar…" : "Apagar conta"}
            </Button>
          </form>
        </Card>
      </Page>
    </>
  );
}
