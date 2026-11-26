"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, forgotPassword, login, register } from "@/lib/api";
import { PasswordInput } from "@/components/password-input";
import { AuthShell, Button, Notice, inputClass, labelClass } from "@/components/ui";

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
    <AuthShell title="Convocados" subtitle={SUBTITLE[mode]}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <label className={labelClass}>
            Nome
            <input
              className={inputClass}
              placeholder="Nome"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        <label className={labelClass}>
          Email
          <input
            className={inputClass}
            type="email"
            inputMode="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {mode !== "forgot" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Password</span>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-sm font-medium text-brand-strong hover:underline"
                  onClick={() => switchTo("forgot")}
                >
                  Esqueci-me da password
                </button>
              )}
            </div>
            <PasswordInput
              placeholder="Password"
              aria-label="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 10 : 1}
            />
            {mode === "register" && <p className="text-xs text-muted">Pelo menos 10 caracteres.</p>}
          </div>
        )}
        {error && (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        )}
        {info && (
          <Notice tone="ok" role="status">
            {info}
          </Notice>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Aguarde…" : submitLabel}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-3 border-t border-line pt-5 text-sm text-muted">
        <p>
          {mode === "login" ? "Ainda não tens conta? " : mode === "register" ? "Já estás registado? " : null}
          <button
            type="button"
            className="font-semibold text-brand-strong hover:underline"
            onClick={() => switchTo(mode === "register" ? "login" : mode === "forgot" ? "login" : "register")}
          >
            {mode === "login" ? "Criar conta" : mode === "register" ? "Já tenho conta" : "Voltar ao login"}
          </button>
        </p>
        {mode === "register" && (
          <p className="text-center text-xs">
            Ao criar conta aceitas a{" "}
            <Link href="/privacidade" className="underline">
              política de privacidade
            </Link>
            .
          </p>
        )}
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">A carregar…</main>}>
      <LoginForm />
    </Suspense>
  );
}
