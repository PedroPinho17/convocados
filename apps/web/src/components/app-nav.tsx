"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { leaveToLogin, resetSocket } from "@/lib/socket";
import { AppHeader, cn, navLinkClass } from "@/components/ui";

const LINKS = [
  { href: "/games", label: "Jogos" },
  { href: "/groups", label: "Grupos" },
  { href: "/profile", label: "Perfil" },
  { href: "/account", label: "Conta" },
];

/** Barra de cima das páginas com sessão: Jogos, Grupos, Conta e Sair. */
export function AppNav() {
  const pathname = usePathname();

  async function onLogout() {
    await logout().catch(() => undefined);
    resetSocket();
    leaveToLogin();
  }

  return (
    <AppHeader>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(navLinkClass, "px-2.5 sm:px-3", active && "bg-brand-soft text-brand-strong")}
          >
            {l.label}
          </Link>
        );
      })}
      <button type="button" onClick={() => void onLogout()} className={cn(navLinkClass, "px-2.5 sm:px-3")}>
        Sair
      </button>
    </AppHeader>
  );
}
