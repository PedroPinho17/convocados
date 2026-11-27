import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SPORTS, SPORT_KEYS } from "@convocados/shared";
import { AppHeader, Logo } from "@/components/ui";
import {
  HomeActions,
  HomeAndroidInstall,
  HomeFooterLink,
  HomeNavAction,
} from "@/components/home-actions";

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
];

const sports = SPORT_KEYS.filter((k) => k !== "other").map((k) => SPORTS[k].label.toLowerCase());
const sportsLine = `${sports.slice(0, -1).join(", ")} e ${sports.at(-1)}`;

export default function Home() {
  return (
    <>
      <AppHeader brandHref="/">
        <HomeNavAction />
      </AppHeader>

      <main id="main" className="flex flex-1 flex-col">
        {/* Hero: copy + preview assimétrico */}
        <section className="bg-canvas">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div className="animate-rise flex flex-col gap-6">
              <h1 className="font-display max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
                A convocatória da semana, sem contar nomes no{" "}
                <em className="not-italic text-brand">WhatsApp</em>.
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-muted">
                Crias o jogo, partilhas um link e cada um confirma. O Convocados trata das vagas, da
                lista de espera, das equipas e de quem já pagou.
              </p>
              <HomeActions />
              <HomeAndroidInstall />
              <p className="text-sm text-muted">Grátis. Para {sportsLine}.</p>
            </div>

            <div className="animate-rise-delay">
              <GamePreview />
            </div>
          </div>
        </section>

        {/* Três pontos, ritmo variado — não uma grelha de ícones */}
        <section aria-labelledby="features" className="bg-wash-sage">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2
              id="features"
              className="font-display max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Feito para quem organiza todas as <em className="not-italic text-brand">semanas</em>
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {FEATURES.map((f, i) => (
                <article
                  key={f.title}
                  className={`rounded-3xl bg-surface p-6 shadow-[var(--shadow-card)] ring-1 ring-ink/5 transition hover:-translate-y-1 ${
                    i === 1 ? "md:mt-8" : i === 2 ? "md:mt-4" : ""
                  }`}
                >
                  <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 max-w-2xl text-muted">
              Grupos para quem joga sempre junto: a futebolada de quinta ou o padel da empresa. Os
              jogos do grupo aparecem a todos os membros, e cada jogo novo avisa toda a gente.
            </p>
          </div>
        </section>

        {/* Antes e depois */}
        <section aria-labelledby="before-after" className="bg-wash-cream">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2
              id="before-after"
              className="font-display max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              A mesma quinta-feira, de duas maneiras
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
              <figure className="flex flex-col gap-3">
                <figcaption className="text-sm font-semibold text-muted">No grupo</figcaption>
                <ol
                  aria-label="Mensagens do grupo"
                  className="flex flex-col gap-2 rounded-3xl bg-surface/70 p-4 ring-1 ring-ink/5"
                >
                  {CHAT.map((m, i) => (
                    <li
                      key={i}
                      className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2 text-sm shadow-[var(--shadow-soft)]"
                    >
                      <span className="block text-xs font-semibold text-brand-strong">{m.who}</span>
                      {m.text}
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-muted">
                  Alguém conta os nomes à mão, alguém esquece-se de quem desistiu, e no fim ninguém
                  sabe quem pagou.
                </p>
              </figure>

              <figure className="flex flex-col gap-3 md:pt-6">
                <figcaption className="text-sm font-semibold text-muted">No Convocados</figcaption>
                <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-ink/5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p>
                      <strong className="text-2xl">8/10</strong> confirmados
                    </p>
                    <span className="text-sm text-terracotta">1 em espera</span>
                  </div>
                  <ol className="flex flex-col divide-y divide-line text-sm">
                    {CONFIRMED.map((name, i) => (
                      <li key={name} className="flex items-center justify-between gap-3 py-1.5">
                        <span>
                          <span className="mr-2 inline-block w-4 text-right text-xs text-muted">
                            {i + 1}.
                          </span>
                          {name}
                        </span>
                        {i < 5 ? (
                          <span className="text-xs font-semibold text-ok">pago</span>
                        ) : (
                          <span className="text-xs font-semibold text-terracotta">falta 3,75 €</span>
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
          </div>
        </section>

        {/* Foto + texto */}
        <section aria-labelledby="pitch" className="bg-surface">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[var(--shadow-card)] ring-1 ring-ink/5">
              <Image
                src="/landing/pitch.jpg"
                alt="Campo de futebol municipal ao fim da tarde"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority={false}
              />
            </div>
            <div className="flex flex-col gap-4 lg:pl-4">
              <h2
                id="pitch"
                className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Do pavilhão ao relvado
              </h2>
              <p className="leading-relaxed text-muted">
                Seja a pelada de quinta no pavilhão ou o 5-a-side no campo da junta, o fluxo é o
                mesmo: marcas o jogo, mandas o link, e a lista trata do resto.
              </p>
              <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] ring-1 ring-ink/5 sm:max-w-md">
                <Image
                  src="/landing/indoor.jpg"
                  alt="Jogo de futsal num pavilhão indoor"
                  fill
                  sizes="(min-width: 640px) 28rem, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Fecho */}
        <section className="bg-canvas">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:py-20">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Marca o próximo jogo
            </h2>
            <p className="text-muted">
              Funciona no browser, sem instalar nada. Há também app para Android; quem usa iPhone
              entra pela web.
            </p>
            <HomeActions />
            <HomeAndroidInstall />
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-wash-cream">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-sm flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5 font-semibold" aria-label="Convocados">
              <Logo size="sm" />
              <span className="font-display text-lg">Convocados</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted">
              A convocatória da semana, sem contar nomes no WhatsApp.
            </p>
            <p className="text-xs text-muted">© {2026} Convocados</p>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:gap-6">
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
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-md rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-ink/5"
    >
      <div className="flex items-center gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-surface-2 py-2 text-ink ring-1 ring-ink/5">
          <span className="text-[0.7rem] font-semibold uppercase text-muted">qui</span>
          <span className="text-xl font-bold leading-none">27</span>
          <span className="text-[0.7rem] uppercase text-muted">nov</span>
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
        <div className="rounded-2xl bg-brand-soft/60 p-3">
          <p className="font-semibold text-brand-strong">Equipa A</p>
          <p className="text-muted">Rui · Tó · Zé · Leo</p>
        </div>
        <div className="rounded-2xl bg-terracotta-soft p-3">
          <p className="font-semibold text-terracotta">Equipa B</p>
          <p className="text-muted">Bia · Pedro · Sá · Nuno</p>
        </div>
      </div>
    </div>
  );
}
