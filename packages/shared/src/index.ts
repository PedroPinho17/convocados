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

/**
 * Quanto paga cada jogador: total ÷ jogadores, arredondado para cima ao cêntimo,
 * para o organizador nunca ficar a pagar a diferença (30 € ÷ 7 = 4,29 €).
 */
export function sharePerPlayerCents(totalCents: number, players: number): number {
  return Math.ceil(totalCents / Math.max(1, Math.floor(players)));
}

/**
 * Intervalo do valor por pessoa antes de haver confirmações:
 * `min` se vierem todos (vagas + suplentes), `max` se vierem só as vagas.
 */
export function priceRangeCents(game: Pick<GameDto, "totalPriceCents" | "slots" | "subs">) {
  return {
    min: sharePerPlayerCents(game.totalPriceCents, game.slots + game.subs),
    max: sharePerPlayerCents(game.totalPriceCents, game.slots),
  };
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