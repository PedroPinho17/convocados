"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMe } from "@/lib/api";
import { cn } from "@/components/ui";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand-strong";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface px-6 text-base font-semibold text-ink transition hover:bg-surface-2";

/**
 * A página inicial tem vários sítios que dependem da sessão (topo, botões, rodapé):
 * um só pedido /auth/me para todos os que montam ao mesmo tempo. Expira depressa,
 * para quem entra ou sai e volta à página inicial ver o estado certo.
 */
let sessionCheck: { at: number; result: Promise<boolean> } | null = null;
function checkSession(): Promise<boolean> {
  if (!sessionCheck || Date.now() - sessionCheck.at > 2_000) {
    sessionCheck = {
      at: Date.now(),
      result: getMe().then(
        () => true,
        () => false,
      ),
    };
  }
  return sessionCheck.result;
}

function useLoggedIn(): boolean | null {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void checkSession().then((v) => {
      if (!cancelled) setLoggedIn(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return loggedIn;
}

/** Botões da página inicial: mudam se já houver sessão. */
export function HomeActions({ align = "start" }: { align?: "start" | "center" }) {
  const loggedIn = useLoggedIn();

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", align === "center" && "sm:justify-center")}>
      {loggedIn ? (
        <>
          <Link href="/games" className={primary}>
            Ir para os meus jogos
          </Link>
          <Link href="/groups" className={secondary}>
            Os meus grupos
          </Link>
        </>
      ) : (
        <>
          <Link href="/login?mode=register" className={primary}>
            Criar conta grátis
          </Link>
          <Link href="/login" className={secondary}>
            Entrar
          </Link>
        </>
      )}
    </div>
  );
}

/** Link "Entrar"/"Os meus jogos" no topo da página inicial. */
export function HomeNavAction() {
  const loggedIn = useLoggedIn();
  return (
    <Link
      href={loggedIn ? "/games" : "/login"}
      className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-brand-strong hover:bg-brand-soft"
    >
      {loggedIn ? "Os meus jogos" : "Entrar"}
    </Link>
  );
}

/** Link do rodapé: "Entrar" sem sessão, "Os meus jogos" com sessão. */
export function HomeFooterLink() {
  const loggedIn = useLoggedIn();
  return (
    <Link href={loggedIn ? "/games" : "/login"} className="hover:text-ink hover:underline">
      {loggedIn ? "Os meus jogos" : "Entrar"}
    </Link>
  );
}
