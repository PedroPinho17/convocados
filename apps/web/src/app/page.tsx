import type { Metadata } from "next";
import Link from "next/link";
import { SPORTS, SPORT_KEYS } from "@convocados/shared";
import { AppHeader } from "@/components/ui";
import { HomeActions, HomeNavAction } from "@/components/home-actions";

export const metadata: Metadata = {
  title: "Convocados · Organiza os teus jogos",
  description:
    "Futebol, futsal, padel, ténis, basquetebol, voleibol: convoca o grupo, confirma vagas, faz equipas equilibradas e controla quem pagou.",
};

const FEATURES = [
  {
    icon: "📣",
    title: "Convocatória sem confusão",
    text: "Um link para o grupo. Cada um confirma; quando enche, entra na lista de espera e sobe sozinho se alguém desistir.",
  },
  {
    icon: "👥",
    title: "Grupos",
    text: "A futebolada de quinta, o padel da empresa: os jogos do grupo aparecem a todos os membros e cada jogo novo avisa toda a gente.",
  },
  {
    icon: "⚖️",
    title: "Equipas equilibradas",
    text: "Avaliações privadas de 1 a 5 e equipas feitas com um clique, sempre com o mesmo número de jogadores.",
  },
  {
    icon: "💶",
    title: "Quem já pagou",
    text: "O custo do campo dividido pelos confirmados, quem pagou e quanto falta, sem folhas de cálculo.",
  },
  {
    icon: "🔔",
    title: "Lembretes e avisos",
    text: "Notificação quando entras na convocatória, quando faltam jogadores, se o jogo for cancelado, e antes do jogo.",
  },
  {
    icon: "✨",
    title: "Criar com IA",
    text: "Cola a mensagem do WhatsApp (\"quinta 21h no pavilhão, somos 10, 30€\") e o formulário fica preenchido.",
  },
];

const STEPS = [
  { n: "1", title: "Cria o jogo", text: "À mão ou a partir da mensagem do grupo. Escolhe o campo da lista ou escreve o local." },
  { n: "2", title: "Partilha o link", text: "Funciona no telemóvel e no computador, com ou sem a app." },
  { n: "3", title: "Joga", text: "Vagas, lista de espera, equipas e pagamentos tratados. Só tens de aparecer." },
];

export default function Home() {
  return (
    <>
      <AppHeader brandHref="/">
        <HomeNavAction />
      </AppHeader>

      <main className="flex flex-1 flex-col">
        {/* Topo */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--brand-soft),transparent)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-muted">
                <span aria-hidden="true">🏟️</span> Grátis para grupos de amigos
              </p>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Organiza os teus jogos.{" "}
                <span className="text-brand">Sem mensagens perdidas no grupo.</span>
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Convoca, confirma vagas, faz equipas equilibradas e controla quem pagou — para futebol,
                padel, ténis e muito mais.
              </p>
              <HomeActions />
              <ul aria-label="Desportos" className="flex flex-wrap gap-2">
                {SPORT_KEYS.filter((k) => k !== "other").map((k) => (
                  <li
                    key={k}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium shadow-sm ring-1 ring-line"
                  >
                    <span aria-hidden="true">{SPORTS[k].emoji}</span>
                    {SPORTS[k].label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pré-visualização de um jogo */}
            <div aria-hidden="true" className="mx-auto w-full max-w-md">
              <div className="rotate-1 rounded-3xl border border-line bg-surface p-5 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex w-14 flex-col items-center rounded-xl bg-brand-soft py-2 text-brand-strong">
                    <span className="text-[0.7rem] font-semibold uppercase">qui</span>
                    <span className="text-xl font-bold leading-none">27</span>
                    <span className="text-[0.7rem] uppercase">nov</span>
                  </div>
                  <div>
                    <p className="font-semibold">Futebolada de quinta</p>
                    <p className="text-sm text-muted">⚽ Futebol · Pavilhão de Arrifana · 21:00</p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <p>
                      <strong className="text-2xl">8/10</strong> confirmados
                    </p>
                    <span className="text-sm text-muted">3,00 € cada</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                    <div className="h-full w-4/5 rounded-full bg-brand" />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="font-semibold">Equipa A</p>
                    <p className="text-muted">Rui · Tó · Ana · Zé</p>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="font-semibold">Equipa B</p>
                    <p className="text-muted">Bia · Leo · Pedro · Sá</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section aria-labelledby="features-title" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="features-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo o que o grupo precisa
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
            Feito para quem organiza todas as semanas e está farto de contar nomes no WhatsApp.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-brand-soft text-2xl">
                  {f.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section aria-labelledby="how-title" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="how-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Como funciona
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-brand-ink">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chamada final */}
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Marca o próximo jogo em 30 segundos</h2>
          <p className="text-muted">
            Grátis. Funciona no browser; há também app para Android. Quem usa iPhone entra pela web.
          </p>
          <HomeActions align="center" />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <p>© {2026} Convocados</p>
          <nav className="flex gap-4">
            <Link href="/privacidade" className="hover:text-ink hover:underline">
              Privacidade
            </Link>
            <Link href="/login" className="hover:text-ink hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
