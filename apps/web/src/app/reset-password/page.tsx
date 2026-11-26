"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, resetPassword } from "@/lib/api";
import { PasswordInput } from "@/components/password-input";

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
      <>
        <p className="text-green-700">
          Password alterada. Por segurança, terminámos as sessões abertas noutros dispositivos.
        </p>
        <Link href="/login" className="rounded bg-zinc-900 px-3 py-2 text-center text-white">
          Entrar
        </Link>
      </>
    );
  }

  if (!token) {
    return (
      <p className="text-red-600">
        Este link está incompleto. Pede um novo em{" "}
        <Link href="/login" className="underline">
          Esqueci-me da password
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
      <p className="text-xs text-zinc-500">Pelo menos 10 caracteres.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Aguarde…" : "Guardar password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Password nova</h1>
      <Suspense fallback={<p>A carregar…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
