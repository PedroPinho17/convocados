import type { Metadata } from "next";
import Link from "next/link";
import { SPORTS, SPORT_KEYS } from "@convocados/shared";
import { AppHeader } from "@/components/ui";
import { HomeActions, HomeFooterLink, HomeNavAction } from "@/components/home-actions";

export const metadata: Metadata = {
  title: "Convocados · Organiza os teus jogos",
  description:
    "Futebol, futsal, padel, ténis, basquetebol, voleibol: convoca o grupo, confirma vagas, faz equipas equilibradas e controla quem pagou.",
};

/** A conversa de todas as semanas no grupo, antes do Convocados. */
const CHAT = [
  { who: "Rui", text: "Quinta às 21h no pavilhão. Quem vem?" },
  { who: "Tó", text: "Eu" },
  { who: "Ana", text: "+1" },
  { who: "Zé", text: "Vou mas chego atrasado" },
  { who: "Leo", text: "Já somos quantos?" },
  { who: "Ana", text: "Afinal não posso 😕" },
  { who: "Rui", text: "Então ainda falta um. Alguém?" },
  { who: "Bia", text: "Quanto é que é cada um?" },
];

const CONFIRMED = ["Rui", "Tó", "Zé", "Leo", "Bia", "Pedro", "Sá", "Nuno"];

const FEATURES = [
  {
    title: "A lista de espera anda sozinha",
    text: "Quando as vagas enchem, quem confirma a seguir fica em espera. Se alguém desiste, o primeiro da fila entra e recebe um aviso.",
  },
  {
    title: "Equipas equilibradas num clique",
    text: "Cada um avalia os outros de 1 a 5, em privado. As equipas saem com o mesmo número de jogadores e a força mais parecida possível.",
  },
  {
    title: "Quem pagou e quanto falta",
    text: "O custo do campo é dividido pelos confirmados. O organizador marca quem já pagou e vê logo quanto falta receber.",
  },
  {
    title: "Grupos para quem joga sempre junto",
    text: "A futebolada de quinta ou o padel da empresa: os jogos do grupo aparecem a todos os membros, e cada jogo novo avisa toda a gente.",
  },
];

const sports = SPORT_KEYS.filter((k) => k !== "other").map((k) => SPORTS[k].label.toLowerCase());
const sportsLine = `${sports.slice(0, -1).join(", ")} e ${sports.at(-1)}`;

export default function Home() {
  return (
    <>
      <AppHeader brandHref="/">
        <HomeNavAction />
      </AppHeader>

      <main className="flex flex-1 flex-col">
        {/* Topo: o que é, em duas frases, e o jogo como aparece na app */}
        <section className="border-b border-line">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                A convocatória da semana, sem contar nomes no WhatsApp.
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Crias o jogo, partilhas um link e cada um confirma. O Convocados trata das vagas, da lista de
                espera, das equipas e de quem já pagou.
              </p>
              <HomeActions />
              <p className="text-sm text-muted">
                Grátis. Para {sportsLine}.
              </p>
            </div>

            <GamePreview />
          </div>
        </section>

        {/* Antes e depois: a mesma quinta-feira */}
        <section aria-labelledby="before-after" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="before-after" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            A mesma quinta-feira, de duas maneiras
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <figure className="flex flex-col gap-3">
              <figcaption className="text-sm font-semibold uppercase tracking-wide text-muted">No grupo</figcaption>
              <ol aria-label="Mensagens do grupo" className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-4 ring-1 ring-line">
                {CHAT.map((m, i) => (
                  <li key={i} className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2 text-sm shadow-sm">
                    <span className="block text-xs font-semibold text-brand-strong">{m.who}</span>
                    {m.text}
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted">
                Alguém conta os nomes à mão, alguém esquece-se de quem desistiu, e no fim ninguém sabe quem pagou.
              </p>
            </figure>

            <figure className="flex flex-col gap-3">
              <figcaption className="text-sm font-semibold uppercase tracking-wide text-muted">No Convocados</figcaption>
              <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
                <div className="flex items-baseline justify-between gap-3">
                  <p>
                    <strong className="text-2xl">8/10</strong> confirmados
                  </p>
                  <span className="text-sm text-muted">1 em espera</span>
                </div>
                <ol className="flex flex-col divide-y divide-line text-sm">
                  {CONFIRMED.map((name, i) => (
                    <li key={name} className="flex items-center justify-between gap-3 py-1.5">
                      <span>
                        <span className="mr-2 inline-block w-4 text-right text-xs text-muted">{i + 1}.</span>
                        {name}
                      </span>
                      {i < 5 ? (
                        <span className="text-xs font-semibold text-ok">pago</span>
                      ) : (
                        <span className="text-xs font-semibold text-warn">falta 3,75 €</span>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-muted">
                  Em espera: <span className="font-medium text-ink">Marco</span>
                </p>
                <p className="mt-auto rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-brand-strong">
                  A Ana desistiu. O Nuno estava em espera e já entrou.
                </p>
              </div>
              <p className="text-sm text-muted">
                Toda a gente vê a mesma lista, atualizada na hora, no telemóvel ou no computador.
              </p>
            </figure>
          </div>
        </section>

        {/* O que faz, sem cartões a mais */}
        <section aria-labelledby="features" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="features" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Feito para quem organiza todas as semanas
            </h2>
            <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-l-2 border-brand pl-5">
                  <dt className="text-lg font-semibold">{f.title}</dt>
                  <dd className="mt-2 leading-relaxed text-muted">{f.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Fecho */}
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Marca o próximo jogo</h2>
          <p className="text-muted">
            Funciona no browser, sem instalar nada. Há também app para Android; quem usa iPhone entra pela web.
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
            <HomeFooterLink />
          </nav>
        </div>
      </footer>
    </>
  );
}

/** O jogo como aparece na app: data, vagas, preço por pessoa e equipas. */
function GamePreview() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-md rounded-3xl border border-line bg-surface p-5 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-soft py-2 text-brand-strong">
          <span className="text-[0.7rem] font-semibold uppercase">qui</span>
          <span className="text-xl font-bold leading-none">27</span>
          <span className="text-[0.7rem] uppercase">nov</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Futebolada de quinta</p>
          <p className="text-sm text-muted">Pavilhão de Arrifana · 21:00</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p>
            <strong className="text-2xl">8/10</strong> confirmados
          </p>
          <span className="text-sm text-muted">3,75 € cada</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
          <div className="h-full w-4/5 rounded-full bg-brand" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="font-semibold">Equipa A</p>
          <p className="text-muted">Rui · Tó · Zé · Leo</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="font-semibold">Equipa B</p>
          <p className="text-muted">Bia · Pedro · Sá · Nuno</p>
        </div>
      </div>
    </div>
  );
}
