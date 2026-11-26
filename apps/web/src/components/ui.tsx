import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/** Junta classes, ignorando as vazias. */
export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

/** Campos de formulário: altura confortável para o polegar (44 px). */
export const inputClass =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted/80 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

export const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

const VARIANTS = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong shadow-sm",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
};
const SIZES = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
};

export function Button({ variant = "primary", size = "md", className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-muted border-line",
  brand: "bg-brand-soft text-brand-strong border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Mensagem de erro, aviso ou sucesso dentro de um formulário. */
export function Notice({
  tone,
  children,
  role,
}: {
  tone: "danger" | "warn" | "ok" | "brand";
  children: ReactNode;
  role?: "status" | "alert";
}) {
  const cls = {
    danger: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn",
    ok: "bg-ok-soft text-ok",
    brand: "bg-brand-soft text-brand-strong",
  }[tone];
  return (
    <p role={role} className={cn("rounded-xl px-3.5 py-2.5 text-sm", cls)}>
      {children}
    </p>
  );
}

/** Barra de cima: marca e navegação. Fica presa no topo e tem fundo translúcido. */
/** Marca: um "C" em verde, igual para todos os desportos. */
export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center bg-brand font-black text-brand-ink shadow-sm",
        size === "sm" ? "size-8 rounded-lg text-lg" : "size-14 rounded-2xl text-3xl",
      )}
    >
      C
    </span>
  );
}

export function AppHeader({ children, brandHref = "/games" }: { children?: ReactNode; brandHref?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={brandHref}
          aria-label="Convocados"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
        >
          <Logo size="sm" />
          {/* Com navegação, no telemóvel só cabe o logo: o nome volta a partir de 640 px. */}
          <span className={cn("text-lg", children ? "hidden sm:inline" : undefined)}>Convocados</span>
        </Link>
        {children ? (
          <nav aria-label="Principal" className="flex min-w-0 items-center gap-0.5 text-sm sm:gap-1">
            {children}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export const navLinkClass =
  "inline-flex min-h-9 items-center rounded-lg px-3 font-medium text-muted transition hover:bg-surface-2 hover:text-ink";

/** Conteúdo da página: largura máxima e margens que crescem com o ecrã. */
export function Page({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10",
        width === "narrow" ? "max-w-md" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Ecrã de entrada (login, password nova): centrado, com a marca em cima. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label="Convocados: página inicial">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle ? <p className="text-muted">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">{children}</div>
      </div>
    </main>
  );
}

/** Voltar: botão claro, com seta e área de toque grande (não um link perdido no canto). */
export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-line bg-surface py-1.5 pl-2 pr-4 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/50 hover:text-brand-strong"
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full bg-surface-2 text-base transition group-hover:-translate-x-0.5 group-hover:bg-brand-soft"
      >
        ←
      </span>
      {label}
    </Link>
  );
}
