import { z } from "zod";

export const createGameSchema = z.object({
  title: z.string().min(1).max(80),
  location: z.string().min(1).max(120),
  startsAt: z.string().datetime(),
  slots: z.number().int().min(2).max(30),
  subs: z.number().int().min(0).max(10),
  /** Custo total do jogo (ex.: 3000 = 30 € do campo), não o valor por pessoa. */
  totalPriceCents: z.number().int().min(0).max(1_000_000),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UserDto = {
  id: string;
  name: string;
  email: string;
};

/** PATCH /games/:id — todos os campos opcionais */
export const updateGameSchema = createGameSchema.partial();
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