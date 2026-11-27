"use client";

import { useState } from "react";
import "./preview.css";

/*
 * Pré-visualização de redesign do Convocados. Ecrãs de demonstração com dados
 * fictícios: nada daqui fala com a API nem mexe no resto da app.
 */

type Screen = "home" | "games" | "detail" | "profile" | "guide";

const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "Início" },
  { id: "games", label: "Jogos" },
  { id: "detail", label: "Detalhe do jogo" },
  { id: "profile", label: "Perfil" },
  { id: "guide", label: "Guia de estilo" },
];

type MockGame = {
  id: number;
  title: string;
  weekday: string;
  day: string;
  month: string;
  time: string;
  place: string;
  group: string | null;
  confirmed: number;
  slots: number;
  waiting: number;
  price: string;
  status?: "cancelled" | "full";
  paid: number;
};

const GAMES: MockGame[] = [
  {
    id: 1,
    title: "Futebolada de quinta",
    weekday: "qui",
    day: "27",
    month: "nov",
    time: "21:00",
    place: "Pavilhão de Arrifana",
    group: "Quintas da bola",
    confirmed: 8,
    slots: 10,
    waiting: 1,
    price: "3,50 €",
    paid: 5,
  },
  {
    id: 2,
    title: "Sábado de manhã",
    weekday: "sáb",
    day: "29",
    month: "nov",
    time: "10:30",
    place: "Campo do Vizela",
    group: null,
    confirmed: 12,
    slots: 12,
    waiting: 2,
    price: "4,00 €",
    status: "full",
    paid: 9,
  },
  {
    id: 3,
    title: "Futsal dos solteiros",
    weekday: "ter",
    day: "2",
    month: "dez",
    time: "22:00",
    place: "Sportsete, Braga",
    group: "Futsal RC",
    confirmed: 4,
    slots: 10,
    waiting: 0,
    price: "5,20 €",
    paid: 2,
  },
  {
    id: 4,
    title: "Rainha das quintas",
    weekday: "qui",
    day: "20",
    month: "nov",
    time: "21:00",
    place: "Pavilhão de Arrifana",
    group: "Quintas da bola",
    confirmed: 10,
    slots: 10,
    waiting: 0,
    price: "3,50 €",
    status: "cancelled",
    paid: 0,
  },
];

const TEAM_A = [
  { name: "Rui", stars: 5 },
  { name: "Tó", stars: 4 },
  { name: "Zé", stars: 3 },
  { name: "Leo", stars: 4 },
  { name: "Nuno", stars: 5 },
];

const TEAM_B = [
  { name: "Bia", stars: 4 },
  { name: "Pedro", stars: 3 },
  { name: "Sá", stars: 5 },
  { name: "Ana", stars: 4 },
  { name: "Marco", stars: 2 },
];

const SKILLS = [
  { label: "Velocidade", value: 82 },
  { label: "Passe", value: 74 },
  { label: "Remate", value: 61 },
  { label: "Defesa", value: 45 },
  { label: "Fôlego", value: 68 },
];

export default function DesignPreviewPage() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="dp">
      {/* Navegação da app, como ficaria no redesign */}
      <nav className="dp-nav">
        <div className="dp-wrap dp-nav-inner">
          <a href="#" className="dp-logo dp-display" onClick={(e) => e.preventDefault()}>
            <span className="dp-logo-dot" aria-hidden="true" />
            Convocados
          </a>
          <div className="dp-nav-links">
            <a href="#" aria-current="true" onClick={(e) => e.preventDefault()}>
              Jogos
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Grupos
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Perfil
            </a>
          </div>
          <span className="dp-avatar" aria-hidden="true">
            RT
          </span>
        </div>
      </nav>

      {/* Seletor da pré-visualização: muda de ecrã sem sair da página */}
      <div className="dp-screenbar">
        <div className="dp-wrap dp-screenbar-inner">
          <span className="dp-screenbar-label">Pré-visualizar</span>
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="dp-tab"
              aria-pressed={screen === s.id}
              onClick={() => setScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {screen === "home" && <HomeScreen />}
      {screen === "games" && <GamesScreen />}
      {screen === "detail" && <DetailScreen />}
      {screen === "profile" && <ProfileScreen />}
      {screen === "guide" && <GuideScreen />}

      <footer className="dp-preview-footer">
        <div className="dp-wrap">
          Pré-visualização de redesign · dados fictícios · a app real não foi alterada
        </div>
      </footer>
    </div>
  );
}

/* ---------- Início ---------- */

function HomeScreen() {
  return (
    <>
      <header className="dp-hero">
        <div className="dp-wrap dp-hero-inner">
          <div>
            <span className="dp-kicker">Futebol de quintas-feiras</span>
            <h1 className="dp-h1">
              A convocatória
              <br />
              resolve-se
              <br />
              <span className="dp-mark">em 30 segundos</span>
            </h1>
            <p className="dp-lede">
              Crias o jogo, partilhas o link e cada um confirma. Vagas, lista de espera,
              equipas equilibradas e quem já pagou — tudo num sítio, longe do caos do grupo.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" className="dp-btn">
                Convocar jogo
              </button>
              <button type="button" className="dp-btn dp-btn-ghost">
                Entrar por convite
              </button>
            </div>
          </div>

          {/* O próximo jogo, como aparece na app */}
          <div className="dp-card dp-card-hover dp-card-pad" aria-hidden="true">
            <p className="dp-section-title">Próximo jogo</p>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span className="dp-date">
                <span className="dp-date-wd">qui</span>
                <span className="dp-date-day dp-display">27</span>
                <span className="dp-date-mo">nov</span>
              </span>
              <div>
                <p className="dp-game-title">Futebolada de quinta</p>
                <p className="dp-game-meta">Pavilhão de Arrifana · 21:00</p>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="dp-slots">
                  <strong className="dp-display">8/10</strong> confirmados
                </span>
                <span className="dp-chip dp-chip-orange">1 em espera</span>
              </div>
              <div className="dp-track" style={{ marginTop: 8 }}>
                <div className="dp-fill" style={{ width: "80%" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 14, alignItems: "center" }}>
              <div className="dp-dots">
                {["R", "T", "Z", "L", "B", "P", "S", "N"].map((i) => (
                  <span key={i} className="dp-dot">
                    {i}
                  </span>
                ))}
                <span className="dp-dot dp-dot-wait">M</span>
                <span className="dp-dot dp-dot-open">+</span>
                <span className="dp-dot dp-dot-open">+</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="dp-wrap" style={{ padding: "56px 20px" }}>
        <h2 className="dp-section-title">O que faz por ti</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { t: "Lista de espera viva", d: "Alguém desiste, o primeiro da fila entra e leva aviso na hora." },
            { t: "Equipas equilibradas", d: "Avaliações privadas de 1 a 5 viram duas equipas de força parecida." },
            { t: "Quem pagou", d: "O total divide-se pelos confirmados e falta-te saber é quem já pagou." },
            { t: "Grupos fixos", d: "As futeboladas de sempre aparecem a todos os membros do grupo." },
          ].map((f) => (
            <div key={f.t} className="dp-card dp-card-pad">
              <p style={{ margin: 0, fontWeight: 700 }}>{f.t}</p>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------- Lista de jogos ---------- */

function GamesScreen() {
  const upcoming = GAMES.filter((g) => g.status !== "cancelled");
  const past = GAMES.filter((g) => g.status === "cancelled");
  return (
    <main className="dp-wrap dp-games-grid">
      <div>
        <h1 className="dp-display" style={{ fontSize: 34, textTransform: "uppercase", margin: "0 0 24px" }}>
          Os meus jogos
        </h1>
        <p className="dp-section-title">Próximos</p>
        <ul className="dp-game-list">
          {upcoming.map((g) => (
            <GameRow key={g.id} game={g} />
          ))}
        </ul>
        {past.length > 0 && (
          <>
            <p className="dp-section-title" style={{ marginTop: 32 }}>
              Anteriores
            </p>
            <ul className="dp-game-list" style={{ opacity: 0.7 }}>
              {past.map((g) => (
                <GameRow key={g.id} game={g} />
              ))}
            </ul>
          </>
        )}
      </div>

      <aside>
        <div className="dp-card dp-card-pad">
          <p className="dp-section-title">Novo jogo</p>
          {["Título", "Local", "Data e hora", "Vagas"].map((l) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>{l}</label>
              <div
                style={{
                  background: "var(--pitch-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "var(--muted)",
                }}
              >
                {l === "Título" ? "Futebolada de quinta" : l === "Data e hora" ? "qui, 27 nov · 21:00" : "—"}
              </div>
            </div>
          ))}
          <button type="button" className="dp-btn" style={{ width: "100%", marginTop: 4 }}>
            Criar e convocar
          </button>
        </div>
      </aside>
    </main>
  );
}

function GameRow({ game }: { game: MockGame }) {
  const cancelled = game.status === "cancelled";
  const full = game.status === "full";
  return (
    <li className="dp-card dp-card-hover dp-game-row">
      <span className="dp-date">
        <span className="dp-date-wd">{game.weekday}</span>
        <span className="dp-date-day dp-display">{game.day}</span>
        <span className="dp-date-mo">{game.month}</span>
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="dp-game-title">{game.title}</p>
        <p className="dp-game-meta">
          <span>{game.time}</span>
          <span>·</span>
          <span>{game.place}</span>
          {game.group && (
            <>
              <span>·</span>
              <span className="dp-chip dp-chip-ghost">{game.group}</span>
            </>
          )}
        </p>
        {!cancelled && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div className="dp-track" style={{ flex: 1 }}>
              <div className="dp-fill" style={{ width: `${(game.confirmed / game.slots) * 100}%` }} />
            </div>
            <div className="dp-dots">
              {Array.from({ length: game.confirmed }).map((_, i) => (
                <span key={i} className="dp-dot" style={{ width: 18, height: 18, fontSize: 9 }} />
              ))}
              {game.waiting > 0 && (
                <span className="dp-dot dp-dot-wait" style={{ width: 18, height: 18, fontSize: 9 }}>
                  {game.waiting}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="dp-game-right">
        {cancelled ? (
          <span className="dp-chip dp-chip-danger">Cancelado</span>
        ) : (
          <>
            <span className={"dp-slots" + (full ? " dp-slots-full" : "")}>
              <strong className="dp-display">
                {game.confirmed}/{game.slots}
              </strong>{" "}
              vagas
            </span>
            <span className="dp-chip dp-chip-volt">{game.price}</span>
          </>
        )}
      </div>
    </li>
  );
}

/* ---------- Detalhe do jogo ---------- */

function DetailScreen() {
  return (
    <main className="dp-wrap" style={{ padding: "48px 20px 72px" }}>
      <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, color: "var(--muted)" }}>
        ← Voltar aos jogos
      </a>

      {/* Cabeçalho do jogo */}
      <section
        className="dp-card"
        style={{ padding: 28, marginTop: 16, background: "linear-gradient(160deg, var(--pitch-2), var(--pitch))" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between" }}>
          <div>
            <p className="dp-kicker" style={{ marginBottom: 8 }}>
              Quinta · 27 nov · 21:00
            </p>
            <h1 className="dp-display" style={{ fontSize: 40, textTransform: "uppercase", margin: 0 }}>
              Futebolada de quinta
            </h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              Pavilhão de Arrifana · Quintas da bola · 3,50 € cada
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="dp-slots" style={{ fontSize: 15 }}>
              <strong className="dp-display" style={{ fontSize: 44, color: "var(--volt)" }}>
                8/10
              </strong>
              <br />
              confirmados
            </span>
            <div className="dp-track" style={{ width: 160, marginTop: 8 }}>
              <div className="dp-fill" style={{ width: "80%" }} />
            </div>
          </div>
        </div>
        <hr className="dp-divider" style={{ margin: "20px 0" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span className="dp-chip dp-chip-volt">5 pagaram</span>
          <span className="dp-chip dp-chip-orange">3 faltam pagar · 10,50 €</span>
          <span className="dp-chip dp-chip-ghost">1 em espera: Marco</span>
          <button type="button" className="dp-btn dp-btn-sm" style={{ marginLeft: "auto" }}>
            Confirmar presença
          </button>
        </div>
      </section>

      {/* Equipas sorteadas */}
      <section style={{ marginTop: 36 }}>
        <p className="dp-section-title">Equipas sorteadas</p>
        <div className="dp-teams">
          <div className="dp-card" style={{ overflow: "hidden" }}>
            <div className="dp-team-head dp-team-head-a">
              <span className="dp-display">Equipa A</span>
              <span>Força 4,2</span>
            </div>
            <div className="dp-team-body">
              {TEAM_A.map((p, i) => (
                <div key={p.name} className="dp-player-row">
                  <span className="dp-player-num dp-mono">{i + 1}</span>
                  <span>{p.name}</span>
                  <Stars value={p.stars} />
                </div>
              ))}
            </div>
          </div>
          <div className="dp-card" style={{ overflow: "hidden" }}>
            <div className="dp-team-head dp-team-head-b">
              <span className="dp-display">Equipa B</span>
              <span>Força 3,8</span>
            </div>
            <div className="dp-team-body">
              {TEAM_B.map((p, i) => (
                <div key={p.name} className="dp-player-row">
                  <span className="dp-player-num dp-mono">{i + 1}</span>
                  <span>{p.name}</span>
                  <Stars value={p.stars} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pagamentos */}
      <section style={{ marginTop: 36 }}>
        <p className="dp-section-title">Pagamentos · total do campo 35,00 €</p>
        <div className="dp-card dp-card-pad">
          {["Rui", "Tó", "Zé", "Leo", "Bia", "Pedro", "Sá", "Nuno"].map((name, i) => (
            <div key={name} className="dp-player-row">
              <span className="dp-player-num dp-mono">{i + 1}</span>
              <span>{name}</span>
              <span
                className={"dp-chip " + (i < 5 ? "dp-chip-volt" : "dp-chip-orange")}
                style={{ marginLeft: "auto" }}
              >
                {i < 5 ? "pago" : "3,50 €"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="dp-stars" style={{ marginLeft: "auto" }} aria-label={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < value ? "" : "dp-stars-dim"}>
          ★
        </span>
      ))}
    </span>
  );
}

/* ---------- Perfil ---------- */

function ProfileScreen() {
  return (
    <main className="dp-wrap" style={{ padding: "48px 20px 72px", maxWidth: 760 }}>
      <div className="dp-profile-head">
        <span className="dp-avatar dp-avatar-lg">RT</span>
        <div style={{ flex: 1 }}>
          <h1 className="dp-display" style={{ fontSize: 34, textTransform: "uppercase", margin: 0 }}>
            Rui Tavares
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            Quintas da bola · joga desde setembro de 2025
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <span className="dp-chip dp-chip-volt">Média 4,3 ★</span>
            <span className="dp-chip dp-chip-ghost">Organizador</span>
          </div>
        </div>
        <button type="button" className="dp-btn dp-btn-ghost dp-btn-sm">
          Editar perfil
        </button>
      </div>

      <div className="dp-stat-grid" style={{ marginTop: 28 }}>
        {[
          { v: "42", l: "Jogos" },
          { v: "31", l: "Presenças" },
          { v: "18", l: "Golos" },
        ].map((s) => (
          <div key={s.l} className="dp-card dp-stat">
            <div className="dp-stat-value dp-display">{s.v}</div>
            <div className="dp-stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="dp-card dp-card-pad" style={{ marginTop: 16 }}>
        <p className="dp-section-title">Força em campo · avaliação média que recebes</p>
        {SKILLS.map((s) => (
          <div key={s.label} className="dp-bar-row">
            <span>{s.label}</span>
            <div className="dp-track">
              <div className="dp-fill" style={{ width: `${s.value}%` }} />
            </div>
            <span className="dp-bar-value dp-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="dp-card dp-card-pad" style={{ marginTop: 16 }}>
        <p className="dp-section-title">Últimos jogos</p>
        {GAMES.slice(0, 3).map((g) => (
          <div key={g.id} className="dp-player-row">
            <span className="dp-date" style={{ width: 44, height: 48 }}>
              <span className="dp-date-day dp-display" style={{ fontSize: 16 }}>
                {g.day}
              </span>
              <span className="dp-date-mo">{g.month}</span>
            </span>
            <span>
              <span style={{ display: "block", fontWeight: 600 }}>{g.title}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{g.place}</span>
            </span>
            <span className="dp-chip dp-chip-volt" style={{ marginLeft: "auto" }}>
              jogou
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ---------- Guia de estilo ---------- */

const COLORS = [
  { name: "Night (fundo)", hex: "#0B1D14" },
  { name: "Pitch (cartões)", hex: "#12291C" },
  { name: "Pitch 2 (elevado)", hex: "#1A3626" },
  { name: "Chalk (texto)", hex: "#F2F5EE" },
  { name: "Muted (secundário)", hex: "#9FB3A6" },
  { name: "Volt (ação)", hex: "#CDFF50" },
  { name: "Volt deep (sombra)", hex: "#9ECF1E" },
  { name: "Tático (aviso)", hex: "#FF6A3D" },
  { name: "Danger", hex: "#FF5C5C" },
];

const TYPE = [
  { tag: "Display · Anton 400", style: { fontFamily: "Anton, sans-serif", fontSize: 40, textTransform: "uppercase" }, text: "Convocados" },
  { tag: "H1 · Anton 400 / 38–64px", style: { fontFamily: "Anton, sans-serif", fontSize: 30, textTransform: "uppercase" }, text: "Os meus jogos" },
  { tag: "Título · Archivo 700 / 17px", style: { fontWeight: 700, fontSize: 17 }, text: "Futebolada de quinta" },
  { tag: "Corpo · Archivo 400 / 16px", style: { fontSize: 16 }, text: "Crias o jogo, partilhas o link e cada um confirma." },
  { tag: "Meta · Archivo 500 / 14px", style: { fontSize: 14, color: "var(--muted)" }, text: "Pavilhão de Arrifana · 21:00 · 10 vagas" },
  { tag: "Etiqueta · 12px caps", style: { fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }, text: "Próximos jogos" },
];

function GuideScreen() {
  return (
    <main className="dp-wrap dp-guide">
      <h1 className="dp-display" style={{ fontSize: 34, textTransform: "uppercase", margin: "0 0 32px" }}>
        Guia de estilo
      </h1>

      <p className="dp-section-title">Cores</p>
      <div className="dp-swatches">
        {COLORS.map((c) => (
          <div key={c.hex} className="dp-swatch">
            <div className="dp-swatch-color" style={{ background: c.hex }} />
            <div className="dp-swatch-meta">
              <span className="dp-swatch-name">{c.name}</span>
              <span className="dp-swatch-hex">{c.hex}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="dp-section-title" style={{ marginTop: 40 }}>
        Tipografia
      </p>
      <div className="dp-card dp-card-pad">
        {TYPE.map((t) => (
          <div key={t.tag} className="dp-type-row">
            <span className="dp-type-tag">{t.tag}</span>
            <span style={t.style}>{t.text}</span>
          </div>
        ))}
      </div>

      <p className="dp-section-title" style={{ marginTop: 40 }}>
        Componentes
      </p>
      <div className="dp-card dp-card-pad" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button type="button" className="dp-btn">
          Botão principal
        </button>
        <button type="button" className="dp-btn dp-btn-ghost">
          Botão secundário
        </button>
        <span className="dp-chip dp-chip-volt">Pago</span>
        <span className="dp-chip dp-chip-orange">Em espera</span>
        <span className="dp-chip dp-chip-danger">Cancelado</span>
        <span className="dp-chip dp-chip-ghost">Etiqueta</span>
        <span className="dp-date">
          <span className="dp-date-wd">qui</span>
          <span className="dp-date-day dp-display">27</span>
          <span className="dp-date-mo">nov</span>
        </span>
        <span className="dp-avatar">RT</span>
      </div>

      <p className="dp-section-title" style={{ marginTop: 40 }}>
        Espaçamento
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
        Escala de 8px: 8 · 16 · 24 · 32 · 48 · 64. Raios: 10px (campos), 12px (botões), 16px (cartões),
        999px (etiquetas). Sombra dura nos botões: 0 4px 0 #9ECF1E.
      </p>
    </main>
  );
}
