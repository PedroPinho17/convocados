"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, login, register } from "@/lib/api";

function safeNext(raw: string | null): string {
  // Só caminhos deste site: "//x" e "/\x" levariam o browser para outro domínio.
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return "/games";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Convocados</h1>
      <p className="text-zinc-600">
        {mode === "login" ? "Entra na tua conta" : "Cria uma conta"}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded border border-zinc-300 px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 10 : 1}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Registar"}
        </button>
      </form>

      <button
        type="button"
        className="text-sm text-zinc-600 underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Criar conta" : "Já tenho conta"}
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8">A carregar…</main>}>
      <LoginForm />
    </Suspense>
  );
}