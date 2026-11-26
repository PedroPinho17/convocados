"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, forgotPassword, login, register } from "@/lib/api";
import { PasswordInput } from "@/components/password-input";

function safeNext(raw: string | null): string {
  // Só caminhos deste site: "//x" e "/\x" levariam o browser para outro domínio.
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return "/games";
}

type Mode = "login" | "register" | "forgot";

const SUBTITLE: Record<Mode, string> = {
  login: "Entra na tua conta",
  register: "Cria uma conta",
  forgot: "Recebe um link por email para escolheres uma password nova",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      if (mode === "forgot") {
        await forgotPassword({ email });
        // Igual exista ou não a conta: não se descobre quem está registado.
        setInfo(
          "Se existir uma conta com este email, enviámos um link para escolheres uma password nova. Vê também o spam.",
        );
        return;
      }
      if (mode === "login") await login({ email, password });
      else await register({ name, email, password });
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  const submitLabel =
    mode === "login" ? "Entrar" : mode === "register" ? "Registar" : "Enviar link";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Convocados</h1>
      <p className="text-zinc-600">{SUBTITLE[mode]}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            placeholder="Nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded border border-zinc-300 px-3 py-2"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== "forgot" && (
          <PasswordInput
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "register" ? 10 : 1}
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Aguarde…" : submitLabel}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm text-zinc-600">
        {mode === "login" && (
          <button type="button" className="underline" onClick={() => switchTo("forgot")}>
            Esqueci-me da password
          </button>
        )}
        <button
          type="button"
          className="underline"
          onClick={() => switchTo(mode === "register" ? "login" : mode === "forgot" ? "login" : "register")}
        >
          {mode === "login" ? "Criar conta" : mode === "register" ? "Já tenho conta" : "Voltar ao login"}
        </button>
        {mode === "register" && (
          <p className="text-center text-xs text-zinc-500">
            Ao criar conta aceitas a{" "}
            <Link href="/privacidade" className="underline">
              política de privacidade
            </Link>
            .
          </p>
        )}
      </div>
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
