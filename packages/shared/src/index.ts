import { z } from "zod";

/**
 * Desportos da plataforma. `slots`/`subs` são os valores por defeito ao criar um jogo;
 * `osm` são as etiquetas `sport` do OpenStreetMap que servem para os campos.
 */
export const SPORTS = {
  football: { label: "Futebol", emoji: "⚽", slots: 10, subs: 2, osm: ["soccer", "futsal", "multi"] },
  futsal: { label: "Futsal", emoji: "⚽", slots: 10, subs: 2, osm: ["futsal", "soccer", "multi"] },
  padel: { label: "Padel", emoji: "🎾", slots: 4, subs: 1, osm: ["padel"] },
  tennis: { label: "Ténis", emoji: "🎾", slots: 2, subs: 0, osm: ["tennis"] },
  basketball: { label: "Basquetebol", emoji: "🏀", slots: 10, subs: 2, osm: ["basketball", "multi"] },
  volleyball: { label: "Voleibol", emoji: "🏐", slots: 12, subs: 2, osm: ["volleyball", "multi"] },
  other: { label: "Outro", emoji: "🏅", slots: 10, subs: 2, osm: [] as string[] },
} as const;
export type Sport = keyof typeof SPORTS;
export const SPORT_KEYS = Object.keys(SPORTS) as Sport[];
export const sportSchema = z.enum(SPORT_KEYS as [Sport, ...Sport[]]);
export const sportLabel = (sport: string) =>
  sport in SPORTS ? `${SPORTS[sport as Sport].emoji} ${SPORTS[sport as Sport].label}` : sport;

/** Campos de um jogo, sem valores por defeito (o PATCH não pode repor nada sem querer). */
const gameFieldsSchema = z.object({
  title: z.string().min(1).max(80),
  location: z.string().min(1).max(120),
  startsAt: z.string().datetime(),
  slots: z.number().int().min(2).max(30),
  subs: z.number().int().min(0).max(10),
  /** Custo total do jogo (ex.: 3000 = 30 € do campo), não o valor por pessoa. */
  totalPriceCents: z.number().int().min(0).max(1_000_000),
  sport: sportSchema,
  /** Campo escolhido da lista (opcional: o "local" escrito continua a valer). */
  venueId: z.string().uuid().nullable(),
});

/** POST /games — o grupo só se escolhe ao criar. */
export const createGameSchema = gameFieldsSchema.extend({
  sport: sportSchema.default("football"),
  venueId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
});
export type CreateGameInput = z.input<typeof createGameSchema>;
export type UserDto = {
  id: string;
  name: string;
  email: string;
};

/** PATCH /games/:id — todos os campos opcionais (o grupo não muda depois de criado). */
export const updateGameSchema = gameFieldsSchema.partial();
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export type GameDto = {
  id: string;
  organizerId: string;
  title: string;
  location: string;
  startsAt: string; // ISO
  slots: number;
  subs: number;
  totalPriceCents: number;
  inviteCode: string;
  status: "open" | "cancelled" | "done";
  createdAt: string; // ISO
  sport: Sport;
  venueId: string | null;
  groupId: string | null;
  groupName: string | null;
  /** Resultado equipa A (null = ainda sem resultado). */
  scoreA: number | null;
  scoreB: number | null;
  /** Crónica IA guardada no jogo (null = ainda não gerada). */
  summary: string | null;
};

/** confirmed = vaga; waiting = lista de espera; left = desistiu */
export type ParticipationStatus = "confirmed" | "waiting" | "left";

export type ParticipationDto = {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  status: ParticipationStatus;
  position: number;
  paid: boolean;
  joinedAt: string; // ISO
};

/**
 * GET /invites/:code — público, sem sessão: só o que a página de convite mostra a quem
 * ainda não entrou. Sem pagamentos, ids de utilizadores, código do convite nem grupo.
 */
export type GameInviteDto = {
  id: string;
  title: string;
  location: string;
  startsAt: string; // ISO
  slots: number;
  subs: number;
  totalPriceCents: number;
  status: GameDto["status"];
  sport: Sport;
  confirmedCount: number;
  waitingCount: number;
  /** Confirmados e lista de espera, pela ordem da convocatória. */
  players: { name: string; status: "confirmed" | "waiting" }[];
};

/**
 * Jogo + listas (detalhe). Só para quem tem acesso ao jogo: organizador, confirmados,
 * lista de espera, membros do grupo, ou quem apresenta o código do convite.
 */
export type GameDetailDto = GameDto & {
  confirmedCount: number;
  waitingCount: number;
  participations: ParticipationDto[];
  /**
   * Equipas guardadas pelo organizador (vazio se ainda não houver). Só com confirmados:
   * quem confirmou depois aparece fora das equipas até o organizador as atualizar.
   */
  teams: TeamDto[];
  /** Diferença de força e texto pt-PT; null se ainda não há equipas. */
  teamsBalance: TeamsBalanceDto | null;
};

export type TeamPlayerDto = {
  userId: string;
  name: string;
  preferredPosition: "GK" | "DEF" | "MID" | "FWD" | "ANY" | null;
  /** Força (Bayesian), 1 casa decimal. */
  strength: number;
};

export type TeamDto = {
  name: string;
  players: TeamPlayerDto[];
  totalStrength: number;
};

export type TeamsBalanceDto = {
  /** |totalA − totalB| (ou max−min com mais equipas), 1 casa decimal. */
  difference: number;
  /** Ex.: "Diferença de 0,4 pontos". */
  explanation: string;
};

/**
 * Quanto paga cada jogador: total ÷ jogadores, arredondado para cima ao cêntimo,
 * para o organizador nunca ficar a pagar a diferença (30 € ÷ 7 = 4,29 €).
 */
export function sharePerPlayerCents(totalCents: number, players: number): number {
  return Math.ceil(totalCents / Math.max(1, Math.floor(players)));
}

/**
 * Frase com quanto paga cada um. Pagam só os confirmados (a lista de espera não joga):
 * - sem confirmados → o valor se as vagas encherem;
 * - com confirmados → o valor agora e, se ainda há vagas, o valor se encher.
 */
export function shareSummary(
  game: Pick<GameDto, "totalPriceCents" | "slots">,
  confirmedCount?: number,
): string {
  const { totalPriceCents: total, slots } = game;
  if (total <= 0) return "Jogo grátis.";
  const full = formatEuros(sharePerPlayerCents(total, slots));
  if (!confirmedCount || confirmedCount <= 0) {
    return `Cada um paga ${full} se as ${slots} vagas encherem.`;
  }
  if (confirmedCount >= slots) return `Cada um paga ${full} (${slots} confirmados).`;
  const now = formatEuros(sharePerPlayerCents(total, confirmedCount));
  return `Com ${confirmedCount} confirmados, cada um paga ${now}; se encher, ${full}.`;
}

/**
 * ISO (UTC) → "YYYY-MM-DDTHH:mm" na hora local, o formato do <input type="datetime-local">.
 * `toISOString().slice(0, 16)` daria a hora UTC (1h a menos no inverno em Portugal).
 */
export function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

/** POST /push/register — token Expo do dispositivo */
export const registerPushTokenSchema = z.object({
  token: z
    .string()
    .min(20)
    .max(200)
    .regex(/^Expo(nent)?PushToken\[.+\]$/, "Token Expo inválido"),
  platform: z.enum(["ios", "android"]).optional(),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

/** POST /push/unregister — ao sair da conta, o dispositivo deixa de receber notificações. */
export const unregisterPushTokenSchema = registerPushTokenSchema.pick({ token: true });
export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;

/** Lembretes antes do jogo, em minutos. Lista fixa para não aparecerem valores estranhos. */
export const REMINDER_OPTIONS = [15, 30, 60, 120, 1440] as const;
export const MAX_REMINDERS = 3;
export const DEFAULT_REMINDERS: number[] = [120];

/** PUT /push/reminders */
export const reminderSettingsSchema = z.object({
  reminderMinutes: z
    .array(z.literal(REMINDER_OPTIONS))
    .max(MAX_REMINDERS, `No máximo ${MAX_REMINDERS} lembretes.`)
    .refine((list) => new Set(list).size === list.length, "Lembretes repetidos."),
});
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

/** GET /push/reminders — o que o telemóvel precisa para agendar os lembretes locais. */
export type RemindersDto = {
  reminderMinutes: number[];
  /** Jogos futuros e abertos em que estou confirmado. */
  games: { gameId: string; title: string; location: string; startsAt: string }[];
};

export type PlannedReminder = {
  gameId: string;
  /** Quando tocar (ms desde 1970). */
  at: number;
  minutesBefore: number;
  title: string;
  body: string;
};

/**
 * Que lembretes agendar no telemóvel: um por jogo e por antecedência escolhida,
 * só os que ainda estão no futuro, por ordem de hora. Função pura (testável sem telemóvel).
 */
export function planReminders(
  games: RemindersDto["games"],
  reminderMinutes: number[],
  now: number,
): PlannedReminder[] {
  const minutes = [...new Set(reminderMinutes)].filter((m) => m > 0);
  const planned: PlannedReminder[] = [];
  for (const game of games) {
    const startsAt = new Date(game.startsAt);
    if (Number.isNaN(startsAt.getTime())) continue;
    const time = startsAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    for (const m of minutes) {
      const at = startsAt.getTime() - m * 60_000;
      if (at <= now) continue;
      planned.push({
        gameId: game.gameId,
        at,
        minutesBefore: m,
        title: `${game.title} daqui a ${formatReminder(m)}`,
        body: `${game.location}, às ${time}.`,
      });
    }
  }
  return planned.sort((a, b) => a.at - b.at);
}

/** 15 → "15 min", 120 → "2 h", 1440 → "1 dia" */
export function formatReminder(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 dia" : `${minutes / 1440} dias`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}

/** POST /auth/login */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const newPasswordSchema = z
  .string()
  .min(10, "A password tem de ter pelo menos 10 caracteres.")
  .max(128, "A password pode ter no máximo 128 caracteres.");

/** POST /auth/register — igual ao login + password forte + nome */
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(80),
  password: newPasswordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /auth/password/forgot — responde sempre igual, exista ou não a conta. */
export const forgotPasswordSchema = loginSchema.pick({ email: true });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /auth/password/reset — o token vem no link do email (vale 30 minutos, uma vez). */
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[\w-]{43}$/, "Link inválido."),
  password: newPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** DELETE /account — pede a password outra vez, para ninguém apagar a conta de outro. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** GET /auth/socket-token — token curto para o socket da web. */
export type SocketTokenDto = { token: string; expiresAt: string };

/** PATCH /games/:gameId/participations/:userId/paid — só o organizador */
export const setPaidSchema = z.object({
  paid: z.boolean(),
});
export type SetPaidInput = z.infer<typeof setPaidSchema>;

/** POST /games/:gameId/ratings — avaliar outro jogador confirmado */
export const upsertRatingSchema = z.object({
  toUserId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
});
export type UpsertRatingInput = z.infer<typeof upsertRatingSchema>;

/** Uma avaliação que EU dei (as avaliações são privadas de quem as dá). */
export type RatingDto = {
  id: string;
  gameId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  score: number;
  createdAt: string; // ISO
};

/** POST /games/:gameId/teams — só o organizador; gera e guarda as equipas. */
export const generateTeamsSchema = z.object({
  teamCount: z.number().int().min(2).max(4).default(2),
  /** Semente opcional: "Gerar outra vez" manda outra e muda o empate do snake draft. */
  seed: z.number().int().optional(),
});
export type GenerateTeamsInput = z.input<typeof generateTeamsSchema>;

/** Peso do prior Bayesian (C): com poucas avaliações a força fica perto da média do grupo. */
export const STRENGTH_PRIOR_WEIGHT = 3;
/** Sem avaliações no grupo, o prior é 3 (nota neutra). */
export const DEFAULT_STRENGTH_PRIOR = 3;

/**
 * Força Bayesian: (sum + prior×C) / (count + C). Sem avaliações → prior.
 * Só se usam avaliações de jogos já começados (a API filtra antes).
 */
export function bayesianStrength(
  sum: number,
  count: number,
  prior: number,
  C = STRENGTH_PRIOR_WEIGHT,
): number {
  if (count <= 0) return prior;
  return (sum + prior * C) / (count + C);
}

export function roundStrength(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Texto pt-PT da diferença entre equipas. */
export function teamsBalanceExplanation(difference: number): string {
  const formatted = roundStrength(difference).toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `Diferença de ${formatted} pontos`;
}

export function teamsBalanceSummary(teams: { totalSkill: number }[]): TeamsBalanceDto {
  const totals = teams.map((t) => t.totalSkill);
  const difference = roundStrength(Math.max(...totals) - Math.min(...totals));
  return { difference, explanation: teamsBalanceExplanation(difference) };
}

/** Entrada do algoritmo de equilibrar. */
export type PlayerSkill = {
  userId: string;
  name: string;
  /** Força 1–5 (já com prior Bayesian). */
  skill: number;
  preferredPosition?: "GK" | "DEF" | "MID" | "FWD" | "ANY" | null;
};

export type BalancedTeam = {
  name: string;
  players: PlayerSkill[];
  totalSkill: number;
};

export type BalanceTeamsOptions = {
  teamCount?: number;
  /** Com semente, o empate do snake muda (reprodutível); sem ela, ordem por força. */
  seed?: number;
};

/** PRNG determinista (Mulberry32) para o snake draft com semente. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function teamCapacity(n: number, teamCount: number, teamIndex: number): number {
  const minSize = Math.floor(n / teamCount);
  const extra = n % teamCount;
  return minSize + (teamIndex < extra ? 1 : 0);
}

/** Soft: muitos GR na mesma equipa e posições todas iguais. A força manda sempre. */
function positionSoftCost(teams: BalancedTeam[]): number {
  let cost = 0;
  for (const team of teams) {
    let gk = 0;
    const counts: Record<string, number> = {};
    for (const p of team.players) {
      const pos = p.preferredPosition;
      if (!pos || pos === "ANY") continue;
      if (pos === "GK") gk++;
      counts[pos] = (counts[pos] ?? 0) + 1;
    }
    if (gk > 1) cost += (gk - 1) * 50;
    for (const c of Object.values(counts)) {
      if (c > 2) cost += (c - 2) * 2;
    }
  }
  return cost;
}

function strengthSpread(teams: BalancedTeam[]): number {
  const totals = teams.map((t) => t.totalSkill);
  return Math.max(...totals) - Math.min(...totals);
}

function objective(teams: BalancedTeam[]): number {
  // A diferença de força pesa muito mais que as posições (soft).
  return strengthSpread(teams) * 1000 + positionSoftCost(teams);
}

function retotal(team: BalancedTeam) {
  team.totalSkill = team.players.reduce((s, p) => s + p.skill, 0);
}

/**
 * Snake draft: ronda 0 A→B→…, ronda 1 …→B→A, respeitando o tamanho alvo de cada equipa.
 */
function snakeDraft(ordered: PlayerSkill[], teamCount: number): BalancedTeam[] {
  const n = ordered.length;
  const teams: BalancedTeam[] = Array.from({ length: teamCount }, (_, i) => ({
    name: String.fromCharCode(65 + i),
    players: [],
    totalSkill: 0,
  }));
  const caps = teams.map((_, i) => teamCapacity(n, teamCount, i));

  let round = 0;
  let i = 0;
  while (i < ordered.length) {
    const forward = round % 2 === 0;
    const order = forward
      ? teams.map((_, idx) => idx)
      : teams.map((_, idx) => teamCount - 1 - idx);
    for (const ti of order) {
      if (i >= ordered.length) break;
      if (teams[ti]!.players.length >= caps[ti]!) continue;
      const player = ordered[i++]!;
      teams[ti]!.players.push(player);
      teams[ti]!.totalSkill += player.skill;
    }
    round++;
    // Segurança: se uma ronda não colocou ninguém (tudo cheio), sai.
    if (round > n + teamCount) break;
  }
  return teams;
}

/**
 * Trocas locais entre equipas enquanto a diferença (e soft de posições) melhorar.
 * Ordem fixa de pares → determinista.
 */
function localSearch(teams: BalancedTeam[]): BalancedTeam[] {
  const out = teams.map((t) => ({
    ...t,
    players: [...t.players],
  }));
  for (const t of out) retotal(t);

  let improved = true;
  while (improved) {
    improved = false;
    let bestScore = objective(out);
    let bestSwap: { a: number; ai: number; b: number; bi: number } | null = null;

    for (let a = 0; a < out.length; a++) {
      for (let b = a + 1; b < out.length; b++) {
        for (let ai = 0; ai < out[a]!.players.length; ai++) {
          for (let bi = 0; bi < out[b]!.players.length; bi++) {
            const pa = out[a]!.players[ai]!;
            const pb = out[b]!.players[bi]!;
            out[a]!.players[ai] = pb;
            out[b]!.players[bi] = pa;
            retotal(out[a]!);
            retotal(out[b]!);
            const score = objective(out);
            out[a]!.players[ai] = pa;
            out[b]!.players[bi] = pb;
            retotal(out[a]!);
            retotal(out[b]!);
            if (score + 1e-9 < bestScore) {
              bestScore = score;
              bestSwap = { a, ai, b, bi };
            }
          }
        }
      }
    }

    if (bestSwap) {
      const { a, ai, b, bi } = bestSwap;
      const pa = out[a]!.players[ai]!;
      out[a]!.players[ai] = out[b]!.players[bi]!;
      out[b]!.players[bi] = pa;
      retotal(out[a]!);
      retotal(out[b]!);
      improved = true;
    }
  }
  return out;
}

/**
 * Divide os jogadores em N equipas equilibradas.
 *
 * 1. Ordena por força (ou baralha com `seed` e volta a ordenar por força — o seed
 *    só desempata / muda a ordem inicial do snake).
 * 2. Snake draft com tamanhos ⌊n/N⌋ ou ⌈n/N⌉.
 * 3. Pesquisa local (trocas) a minimizar a diferença de força; GR/DEF/MID/FWD
 *    são preferências suaves e nunca bloqueiam.
 */
export function balanceTeams(
  players: PlayerSkill[],
  options: number | BalanceTeamsOptions = {},
): BalancedTeam[] {
  const opts: BalanceTeamsOptions =
    typeof options === "number" ? { teamCount: options } : options;
  const teamCount = opts.teamCount ?? 2;

  if (teamCount < 2) throw new Error("teamCount deve ser >= 2");
  if (players.length < teamCount) {
    throw new Error("São precisos pelo menos tantos jogadores quantas equipas.");
  }

  const bySkillThenName = (a: PlayerSkill, b: PlayerSkill) =>
    b.skill - a.skill || a.name.localeCompare(b.name, "pt") || a.userId.localeCompare(b.userId);

  // Sem semente: ordem fixa por força e nome. Com semente: baralha e ordena só por
  // força (empates ficam na ordem do baralhamento → "Gerar outra vez" muda o draft).
  const ordered =
    opts.seed === undefined
      ? [...players].sort(bySkillThenName)
      : seededShuffle(players, opts.seed).sort((a, b) => b.skill - a.skill);

  return localSearch(snakeDraft(ordered, teamCount));
}

/** POST /ai/parse-game — mensagem colada (WhatsApp, SMS, etc.) */
export const parseGameMessageSchema = z.object({
  message: z.string().trim().min(10).max(4000),
});
export type ParseGameMessageInput = z.infer<typeof parseGameMessageSchema>;

/**
 * O que a IA deve devolver. Campos opcionais: se falhar parcialmente,
 * o formulário preenche o que houver e o resto fica manual.
 */
export const parsedGameDraftSchema = gameFieldsSchema.partial().extend({
  /** Notas da IA (ex.: "não encontrei a hora"). */
  notes: z.string().max(500).optional(),
});
export type ParsedGameDraft = z.infer<typeof parsedGameDraftSchema>;

export type ParseGameResultDto = {
  draft: ParsedGameDraft;
  /** false → mostrar/abrir o formulário manual (IA falhou ou incompleto). */
  ok: boolean;
  remainingToday: number;
};

/**
 * Valores iniciais do formulário de jogo (web e app): o jogo a editar, ou o rascunho
 * da IA, ou os valores por defeito. A data vem no formato do <input type="datetime-local">.
 */
export function initialGameForm(
  game?: GameDto | null,
  draft?: ParsedGameDraft | null,
  /** Para um jogo novo: o desporto do grupo (define as vagas por defeito). */
  defaults: { sport?: Sport } = {},
) {
  const src = game ?? draft ?? {};
  const sport: Sport = src.sport ?? defaults.sport ?? "football";
  return {
    title: src.title ?? "",
    location: src.location ?? "",
    startsAt: src.startsAt ? toLocalDateTimeInput(src.startsAt) : "",
    slots: src.slots ?? SPORTS[sport].slots,
    subs: src.subs ?? SPORTS[sport].subs,
    totalEuros: (src.totalPriceCents ?? 3000) / 100,
    sport,
    venueId: src.venueId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Grupos: cada grupo é um "tenant" (membros, um desporto principal, os seus jogos).
// ---------------------------------------------------------------------------

/** POST /groups */
export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "O nome tem de ter pelo menos 2 letras.").max(60),
  sport: sportSchema,
});
export type CreateGroupInput = z.input<typeof createGroupSchema>;

export type GroupRole = "admin" | "member";

export type GroupDto = {
  id: string;
  name: string;
  sport: Sport;
  /** Código do link de convite (/g/<código>). */
  inviteCode: string;
  /** O meu papel no grupo. */
  role: GroupRole;
  memberCount: number;
  createdAt: string; // ISO
};

export type GroupMemberDto = { userId: string; name: string; role: GroupRole; joinedAt: string };

export type GroupDetailDto = GroupDto & {
  members: GroupMemberDto[];
  /** Jogos do grupo: os próximos primeiro, depois os anteriores mais recentes. */
  games: GameDto[];
};

/** GET /group-invites/:code — público: o que se vê antes de entrar. */
export type GroupInviteDto = { name: string; sport: Sport; memberCount: number };

// ---------------------------------------------------------------------------
// Campos (venues): pesquisa por nome/localidade, e por distância quando há coordenadas.
// ---------------------------------------------------------------------------

/** GET /venues?q=&lat=&lng=&radiusKm=&sport= */
export const venueSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(50).default(15),
  sport: sportSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});
export type VenueSearchInput = z.input<typeof venueSearchSchema>;
export type VenueSearchQuery = z.infer<typeof venueSearchSchema>;

/** POST /venues — um campo que não está na lista, escrito à mão. */
export const createVenueSchema = z.object({
  name: z.string().trim().min(3, "Escreve o nome do campo.").max(120),
  city: z.string().trim().max(80).nullable().optional(),
  sport: sportSchema.optional(),
});
export type CreateVenueInput = z.input<typeof createVenueSchema>;

export type VenueDto = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  /** null nos campos acrescentados à mão. */
  lat: number | null;
  lng: number | null;
  sports: string[];
  /** Só quando a pesquisa tem coordenadas. */
  distanceKm: number | null;
};

/** "Pavilhão de Arrifana · Romariz" — o texto que fica no campo "Local". */
export const venueLabel = (v: Pick<VenueDto, "name" | "city">) =>
  v.city && !v.name.toLowerCase().includes(v.city.toLowerCase()) ? `${v.name} · ${v.city}` : v.name;

/** Para pesquisar sem acentos nem maiúsculas ("Fiães" = "fiaes"). */
export const foldText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// ---------------------------------------------------------------------------
// Perfil do jogador: campos opcionais + estatísticas a partir de jogos/avaliações.
// O nome de apresentação reutiliza `User.name` (não há coluna displayName).
// ---------------------------------------------------------------------------

export const PREFERRED_POSITIONS = ["GK", "DEF", "MID", "FWD", "ANY"] as const;
export type PreferredPosition = (typeof PREFERRED_POSITIONS)[number];
export const preferredPositionSchema = z.enum(PREFERRED_POSITIONS);

export const PREFERRED_FEET = ["LEFT", "RIGHT", "BOTH"] as const;
export type PreferredFoot = (typeof PREFERRED_FEET)[number];
export const preferredFootSchema = z.enum(PREFERRED_FEET);

export const PREFERRED_POSITION_LABELS: Record<PreferredPosition, string> = {
  GK: "Guarda-redes",
  DEF: "Defesa",
  MID: "Médio",
  FWD: "Avançado",
  ANY: "Qualquer",
};

export const PREFERRED_FOOT_LABELS: Record<PreferredFoot, string> = {
  LEFT: "Esquerdo",
  RIGHT: "Direito",
  BOTH: "Ambos",
};

/** Iniciais a partir do nome (máx. 2 palavras). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * PATCH /me/profile — todos os campos opcionais; `null` limpa posição/pé/cidade/bio.
 * `displayName` atualiza o `name` do utilizador.
 */
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "O nome não pode ficar vazio.").max(80).optional(),
  preferredPosition: preferredPositionSchema.nullable().optional(),
  preferredFoot: preferredFootSchema.nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type PlayerRecentGameDto = {
  id: string;
  startsAt: string; // ISO
  /** Nome do campo (venue) ou o local escrito no jogo. */
  venueName: string;
  /** Ex.: "V 3-1", "E 2-2", "D 0-2", ou só "3-1" sem equipa; null sem resultado. */
  result: string | null;
};

/**
 * Resultado visto pelo jogador: Vitória / Empate / Derrota + marcador.
 * Sem equipa conhecida → só o marcador.
 */
export function formatPlayerGameResult(
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
  team: "A" | "B" | null,
): string | null {
  if (scoreA == null || scoreB == null) return null;
  const score = `${scoreA}-${scoreB}`;
  if (!team) return score;
  if (scoreA === scoreB) return `E ${score}`;
  const won =
    (team === "A" && scoreA > scoreB) || (team === "B" && scoreB > scoreA);
  return won ? `V ${score}` : `D ${score}`;
}

/** PATCH /games/:id/result — só o organizador, depois do kick-off. */
export const setGameResultSchema = z.object({
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
});
export type SetGameResultInput = z.infer<typeof setGameResultSchema>;

/** POST /games/:id/summary — resposta da crónica IA. */
export type MatchSummaryDto = {
  summary: string;
  remainingToday: number;
  ok: boolean;
};

/** GET /games/:id/attendance-forecast — previsão do organizador. */
export type AttendanceForecastDto = {
  expectedPlayers: number;
  neededPlayers: number;
  /** true quando a soma das probabilidades < vagas necessárias. */
  riskOfNotFilling: boolean;
  players: {
    userId: string;
    name: string;
    /** Probabilidade de comparecer, 0–1. */
    probability: number;
  }[];
};

export type PlayerStatsDto = {
  gamesPlayed: number;
  gamesOrganized: number;
  /** null quando ainda não há avaliações (depois do kick-off). */
  averageRating: number | null;
  ratingsCount: number;
  recentGames: PlayerRecentGameDto[];
};

/** GET /me/profile e GET /users/:id/profile — sem email nem dados privados. */
export type PlayerProfileDto = {
  id: string;
  displayName: string;
  initials: string;
  preferredPosition: PreferredPosition | null;
  preferredFoot: PreferredFoot | null;
  city: string | null;
  bio: string | null;
  stats: PlayerStatsDto;
};
