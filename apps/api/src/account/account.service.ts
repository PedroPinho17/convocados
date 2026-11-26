import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '@convocados/db';
import { AuthService } from '../auth/auth.service.js';
import { ParticipationsService } from '../participations/participations.service.js';

/**
 * Apagar a conta (RGPD): apaga o utilizador e, em cascata, sessões, tokens de push,
 * avaliações, equipas, pedidos de IA e jogos que organizou.
 *
 * Antes disso, para não deixar os outros mal:
 * - se organiza jogos futuros com outras pessoas, tem de os cancelar primeiro;
 * - sai dos jogos futuros dos outros como numa desistência normal (a lista de espera
 *   sobe e o organizador é avisado), em vez de a vaga desaparecer sem ninguém saber.
 */
@Injectable()
export class AccountService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auth: AuthService,
    private readonly participations: ParticipationsService,
  ) {}

  async delete(userId: string, password: string): Promise<void> {
    if (!(await this.auth.checkPassword(userId, password))) {
      // 403 e não 401: a sessão é válida, a password é que está errada.
      throw new ForbiddenException('Password incorreta.');
    }

    const blocking: { title: string }[] = await this.dataSource.query(
      `SELECT g."title" FROM "games" g
       WHERE g."organizerId" = $1 AND g."status" = 'open' AND g."startsAt" > now()
         AND EXISTS (
           SELECT 1 FROM "participations" p
           WHERE p."gameId" = g."id" AND p."userId" <> $1
             AND p."status" IN ('confirmed', 'waiting'))
       ORDER BY g."startsAt"`,
      [userId],
    );
    if (blocking.length > 0) {
      const titles = blocking.map((g) => `"${g.title}"`).join(', ');
      throw new ConflictException(
        `Tens jogos marcados com outros jogadores (${titles}). Cancela-os primeiro, para eles serem avisados.`,
      );
    }

    const joined: { gameId: string }[] = await this.dataSource.query(
      `SELECT p."gameId" FROM "participations" p
       JOIN "games" g ON g."id" = p."gameId"
       WHERE p."userId" = $1 AND p."status" IN ('confirmed', 'waiting')
         AND g."status" = 'open' AND g."startsAt" > now() AND g."organizerId" <> $1`,
      [userId],
    );
    for (const { gameId } of joined) {
      await this.participations.leave(gameId, userId);
    }

    await this.dataSource.manager.delete(User, { id: userId });
  }
}
