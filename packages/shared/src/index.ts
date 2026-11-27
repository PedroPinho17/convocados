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

/** Jogo + listas (detalhe e página de convite). */
export type GameDetailDto = GameDto & {
  confirmedCount: number;
  waitingCount: number;
  participations: ParticipationDto[];
  /**
   * Equipas guardadas pelo organizador (vazio se ainda não houver). Só com confirmados:
   * quem confirmou depois aparece fora das equipas até o organizador as atualizar.
   * Sem avaliações: são privadas de quem as deu.
   */
  teams: TeamDto[];
};

export type TeamDto = {
  name: string;
  players: { userId: string; name: string }[];
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
});
export type GenerateTeamsInput = z.input<typeof generateTeamsSchema>;

/** Entrada do algoritmo (só na API: a skill nunca vai para os clientes). */
export type PlayerSkill = {
  userId: string;
  name: string;
  /** Média das avaliações recebidas (1–5). Sem avaliações → 3. */
  skill: number;
};

export type BalancedTeam = {
  name: string;
  players: PlayerSkill[];
  totalSkill: number;
};

/**
 * Divide os jogadores em N equipas equilibradas.
 *
 * Tamanhos: todas as equipas ficam com ⌊n ÷ N⌋ ou ⌈n ÷ N⌉ jogadores (no máximo 1 de
 * diferença). Força: do mais forte para o mais fraco, cada jogador vai para a equipa
 * com menos skill que ainda tem lugar (empate → menos jogadores → primeira equipa).
 * Sem aleatoriedade: os mesmos jogadores e avaliações dão sempre as mesmas equipas.
 */
export function balanceTeams(players: PlayerSkill[], teamCount = 2): BalancedTeam[] {
  if (teamCount < 2) throw new Error("teamCount deve ser >= 2");
  if (players.length < teamCount) {
    throw new Error("São precisos pelo menos tantos jogadores quantas equipas.");
  }

  const teams: BalancedTeam[] = Array.from({ length: teamCount }, (_, i) => ({
    name: String.fromCharCode(65 + i), // A, B, C, D
    players: [],
    totalSkill: 0,
  }));

  const minSize = Math.floor(players.length / teamCount);
  // Quantas equipas podem ter 1 jogador a mais (quando a divisão não é exata).
  let extraSlots = players.length % teamCount;

  const sorted = [...players].sort(
    (a, b) => b.skill - a.skill || a.name.localeCompare(b.name, "pt"),
  );

  for (const player of sorted) {
    const hasRoom = (t: BalancedTeam) =>
      t.players.length < minSize || (t.players.length === minSize && extraSlots > 0);

    let best: BalancedTeam | undefined;
    for (const t of teams) {
      if (!hasRoom(t)) continue;
      if (
        !best ||
        t.totalSkill < best.totalSkill ||
        (t.totalSkill === best.totalSkill && t.players.length < best.players.length)
      ) {
        best = t;
      }
    }
    // Há sempre lugar: a soma das capacidades é exatamente o número de jogadores.
    const team = best!;
    if (team.players.length === minSize) extraSlots--;
    team.players.push(player);
    team.totalSkill += player.skill;
  }

  return teams;
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
