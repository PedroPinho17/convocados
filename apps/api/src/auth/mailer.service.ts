import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config.js';

export type Email = { to: string; subject: string; text: string; html: string };

/**
 * Emails pelo Resend (grátis até 100 por dia). Sem RESEND_API_KEY:
 * - em dev, o email aparece no log (para testares o link sem conta no Resend);
 * - em produção, não envia e avisa no log.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly apiKey: string;
  private readonly from: string;
  private readonly production: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true }) ?? '';
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.production = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /** Nunca lança erro: quem pede não deve saber se o email existe nem se o envio falhou. */
  async send(email: Email): Promise<void> {
    if (!this.apiKey) {
      if (this.production)
        this.logger.warn('RESEND_API_KEY em falta: email não enviado.');
      else
        this.logger.log(
          `[email não enviado — dev] Para ${email.to}: ${email.text}`,
        );
      return;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, ...email, to: [email.to] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.warn(`Resend respondeu ${res.status}`);
    } catch (err) {
      this.logger.warn(`Falha ao enviar email: ${(err as Error).message}`);
    }
  }
}
