import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { PasswordReset, User } from '@convocados/db';
import type { Env } from '../config.js';
import { passwordResetEmail } from '../mail/templates/password-reset.js';
import { AuthService } from './auth.service.js';
import { MailerService } from './mailer.service.js';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const RESET_TTL_MS = 30 * 60_000;

/**
 * Recuperar a password por email:
 * - o link vale 30 minutos e só uma vez; um pedido novo anula os anteriores;
 * - guarda-se só o hash do token (como nas sessões);
 * - a resposta é sempre a mesma, exista ou não a conta (não se descobre quem está registado);
 * - mudar a password termina todas as sessões.
 */
@Injectable()
export class PasswordResetService {
  private readonly appUrl: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auth: AuthService,
    private readonly mailer: MailerService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true })!;
  }

  /** Não espera pelo email: a resposta demora o mesmo com ou sem conta. */
  async request(email: string): Promise<void> {
    const manager = this.dataSource.manager;
    const user = await manager.findOneBy(User, { email });
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await manager.transaction(async (tx) => {
      await tx.update(
        PasswordReset,
        { userId: user.id, usedAt: IsNull() },
        { usedAt: new Date() },
      );
      await tx.insert(PasswordReset, {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      });
    });

    const link = `${this.appUrl}/reset-password?token=${token}`;
    const mail = passwordResetEmail({
      name: user.name,
      resetUrl: link,
      appUrl: this.appUrl,
    });
    void this.mailer.send({ to: user.email, ...mail });
  }

  async reset(token: string, password: string): Promise<void> {
    const now = new Date();
    // Marcar como usado e ler numa só instrução: dois pedidos com o mesmo link não passam os dois.
    // (Dentro de um WITH para o TypeORM devolver só as linhas; com UPDATE devolvia [linhas, n].)
    const rows: { userId: string }[] = await this.dataSource.query(
      `WITH used AS (
         UPDATE "password_resets" SET "usedAt" = $2
         WHERE "tokenHash" = $1 AND "usedAt" IS NULL AND "expiresAt" > $2
         RETURNING "userId"
       )
       SELECT "userId" FROM used`,
      [sha256(token), now],
    );
    const userId = rows[0]?.userId;
    if (!userId) {
      throw new BadRequestException('Este link já não é válido. Pede um novo.');
    }
    await this.auth.setPassword(userId, password);
  }

  /** Para os testes e para quem quiser saber se ainda há um link ativo. */
  activeCount(userId: string): Promise<number> {
    return this.dataSource.manager.countBy(PasswordReset, {
      userId,
      usedAt: IsNull(),
      expiresAt: MoreThan(new Date()),
    });
  }
}
