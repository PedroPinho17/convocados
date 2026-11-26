"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserDto } from "@convocados/shared";
import { ApiError, deleteAccount, getMe } from "@/lib/api";
import { leaveToLogin, resetSocket } from "@/lib/socket";
import { PasswordInput } from "@/components/password-input";

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

  if (!me) return <main className="p-8">A carregar…</main>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Conta</h1>
        <Link href="/games" className="text-sm underline">
          Voltar aos jogos
        </Link>
      </header>

      <section className="flex flex-col gap-1">
        <p className="font-medium">{me.name}</p>
        <p className="text-sm text-zinc-600">{me.email}</p>
        <Link href="/privacidade" className="text-sm underline">
          Política de privacidade
        </Link>
      </section>

      <form onSubmit={onDelete} className="flex flex-col gap-3 rounded border border-red-200 p-4">
        <h2 className="font-medium text-red-700">Apagar conta</h2>
        <p className="text-sm text-zinc-600">
          Apaga o teu nome, email, avaliações e os jogos que organizaste. Nos jogos dos outros sais
          como numa desistência normal. Não dá para desfazer.
        </p>
        <PasswordInput
          placeholder="A tua password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          Quero apagar a minha conta
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !sure}
          className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "A apagar…" : "Apagar conta"}
        </button>
      </form>
    </main>
  );
}
