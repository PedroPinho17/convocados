import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade · Convocados",
  description: "Que dados o Convocados guarda, porquê e como apagar a tua conta.",
};

/** Contacto para questões de privacidade (definir em NEXT_PUBLIC_CONTACT_EMAIL). */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 text-zinc-800">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Política de privacidade</h1>
        <p className="text-sm text-zinc-500">Última atualização: 26 de novembro de 2026</p>
        <p>
          O Convocados é uma app para organizar jogos de futebol entre amigos. Guarda só o que
          precisa para isso, não mostra publicidade e não vende nem partilha dados para outros fins.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">O que guardamos e para quê</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Nome e email</strong>: para entrares na conta, os outros jogadores verem quem vai
            e para te enviarmos o link de recuperar a password. O email nunca é mostrado a outros.
          </li>
          <li>
            <strong>Password</strong>: só guardamos uma versão cifrada (scrypt); ninguém a consegue ler.
          </li>
          <li>
            <strong>Jogos</strong>: os jogos que crias, em quais confirmaste ou estás em espera, e se o
            organizador marcou que pagaste.
          </li>
          <li>
            <strong>Avaliações</strong> (1 a 5) que dás a outros jogadores: servem só para equilibrar as
            equipas. Ninguém vê as notas que deste nem as que recebeste.
          </li>
          <li>
            <strong>Notificações</strong>: o identificador do teu telemóvel para receberes avisos, e os
            lembretes que escolheste.
          </li>
          <li>
            <strong>Um cookie de sessão</strong>, necessário para ficares com a sessão iniciada. Não há
            cookies de publicidade nem de estatísticas.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Quem mais trata os dados</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Render</strong> e <strong>Neon</strong>: onde a app e a base de dados estão alojadas.
          </li>
          <li>
            <strong>Groq</strong>: quando usas &quot;Preencher com IA&quot;, o texto que colaste é
            enviado ao Groq para ler a data, a hora e o local. Não o guardamos. Não cole lá dados que
            não queiras partilhar.
          </li>
          <li>
            <strong>Expo</strong>: entrega as notificações no telemóvel. <strong>Resend</strong>: envia o
            email de recuperar a password.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Durante quanto tempo e como apagar</h2>
        <p>
          Os dados ficam enquanto tiveres conta. Podes apagá-la a qualquer momento em{" "}
          <Link href="/account" className="underline">
            Conta
          </Link>{" "}
          (na web) ou em Definições → Apagar conta (na app). Isso apaga o teu nome, email, avaliações,
          notificações e os jogos que organizaste. Nos jogos dos outros, sais como numa desistência
          normal.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Os teus direitos</h2>
        <p>
          Pelo RGPD, podes pedir acesso, correção ou eliminação dos teus dados, e reclamar à CNPD
          (Comissão Nacional de Proteção de Dados).
          {CONTACT ? (
            <>
              {" "}
              Para qualquer pedido:{" "}
              <a href={`mailto:${CONTACT}`} className="underline">
                {CONTACT}
              </a>
              .
            </>
          ) : null}
        </p>
      </section>

      <p>
        <Link href="/games" className="underline">
          Voltar aos jogos
        </Link>
      </p>
    </main>
  );
}
