import { NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

/** 12 hex = 48 bits: curto para o link/QR e impossível de adivinhar à força. */
export const INVITE_CODE_RE = /^[0-9a-f]{8,32}$/;

/** O código do convite como vem no URL (maiúsculas, espaços); null se não for válido. */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toLowerCase();
  return INVITE_CODE_RE.test(code) ? code : null;
}

/**
 * Quem pode ver o jogo, entrar na sala do socket, confirmar e desistir:
 * - o organizador;
 * - quem está confirmado ou na lista de espera;
 * - os membros do grupo, se o jogo for de um grupo;
 * - quem apresenta o código do convite (o link /i/<código>).
 */
export async function canAccessGame(
  manager: EntityManager,
  gameId: string,
  userId: string,
  inviteCode?: string | null,
): Promise<boolean> {
  const rows: unknown[] = await manager.query(
    `SELECT 1 FROM "games" g
      WHERE g."id" = $1
        AND (
          g."organizerId" = $2
          OR ($3::varchar IS NOT NULL AND g."inviteCode" = $3::varchar)
          OR EXISTS (
            SELECT 1 FROM "participations" p
             WHERE p."gameId" = g."id" AND p."userId" = $2
               AND p."status" IN ('confirmed', 'waiting')
          )
          OR (
            g."groupId" IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM "group_members" m
               WHERE m."groupId" = g."groupId" AND m."userId" = $2
            )
          )
        )
      LIMIT 1`,
    [gameId, userId, inviteCode ?? null],
  );
  return rows.length > 0;
}

/** 404 (e não 403) para quem não tem acesso: não se fica a saber que o jogo existe. */
export async function assertGameAccess(
  manager: EntityManager,
  gameId: string,
  userId: string,
  inviteCode?: string | null,
): Promise<void> {
  if (!(await canAccessGame(manager, gameId, userId, inviteCode))) {
    throw new NotFoundException('Jogo não encontrado.');
  }
}
