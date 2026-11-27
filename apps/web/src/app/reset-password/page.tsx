"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, resetPassword } from "@/lib/api";
import { PasswordInput } from "@/components/password-input";
import { AuthShell, Button, Notice } from "@/components/ui";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeat) {
      setError("As passwords não são iguais.");
      return;
    }
    setPending(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="ok" role="status">
          Password alterada. Por segurança, terminámos as sessões abertas noutros dispositivos.
        </Notice>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-4 font-semibold text-brand-ink hover:bg-brand-strong"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <Notice tone="danger" role="alert">
        Este link está incompleto. Pede um novo em{" "}
        <Link href="/login" className="font-semibold underline">
          Esqueci-me da password
        </Link>
        .
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <PasswordInput
        placeholder="Password nova"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={10}
      />
      <PasswordInput
        placeholder="Repete a password"
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        required
        minLength={10}
      />
      <p className="text-xs text-muted">Pelo menos 10 caracteres.</p>
      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Aguarde…" : "Guardar password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Password nova" subtitle="Escolhe uma password que não uses noutros sítios.">
      <Suspense fallback={<p className="text-muted">A carregar…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
