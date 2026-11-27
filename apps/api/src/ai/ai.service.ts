import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ParseGameResultDto } from '@convocados/shared';
import type { Env } from '../config.js';
import { buildSystemPrompt, isUsable, toDraft } from './ai-draft.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Mais do que isto e a pessoa já preferia ter escrito à mão. */
const GROQ_TIMEOUT_MS = 15_000;

/** Dia UTC (AAAA-MM-DD): o limite diário renova à meia-noite UTC. */
const utcDay = (now: Date) => now.toISOString().slice(0, 10);

export type ChatOptions = {
  system: string;
  user: string;
  /** Por defeito true (parse-game). A crónica pode ser texto simples. */
  json?: boolean;
  temperature?: number;
};

/**
 * Pedidos à IA (Groq). A IA nunca é obrigatória: sem chave ou se falhar,
 * o resto da app continua a funcionar. A quota diária é partilhada.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly dailyLimit: number;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    config: ConfigService<Env, true>,
  ) {
    this.dailyLimit = config.get('AI_DAILY_LIMIT', { infer: true });
    this.apiKey = config.get('GROQ_API_KEY', { infer: true }) ?? '';
    this.model = config.get('GROQ_MODEL', { infer: true });
  }

  get hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  get limit(): number {
    return this.dailyLimit;
  }

  async remainingToday(userId: string, now = new Date()): Promise<number> {
    return this.remaining(userId, now);
  }

  /**
   * Gasta 1 da quota. Devolve remainingToday, ou null se já estava no limite (429).
   * Sem chave Groq: não gasta e devolve remaining.
   */
  async tryConsume(
    userId: string,
    now = new Date(),
  ): Promise<{ remainingToday: number } | null> {
    if (!this.apiKey) {
      return { remainingToday: await this.remaining(userId, now) };
    }
    const used = await this.consume(userId, now);
    if (used === null) return null;
    return { remainingToday: this.dailyLimit - used };
  }

  async chat(opts: ChatOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('A IA não está ligada neste servidor.');
    }
    const body: Record<string, unknown> = {
      model: this.model,
      temperature: opts.temperature ?? 0,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    };
    if (opts.json !== false) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Groq respondeu ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq sem conteúdo');
    return content;
  }

  async parseGame(
    userId: string,
    message: string,
    now = new Date(),
  ): Promise<ParseGameResultDto> {
    if (!this.apiKey) {
      return {
        ok: false,
        draft: {
          notes: 'A IA não está ligada neste servidor. Preenche o formulário.',
        },
        remainingToday: await this.remaining(userId, now),
      };
    }

    const used = await this.consume(userId, now);
    if (used === null) {
      throw new HttpException(
        `Já usaste os ${this.dailyLimit} pedidos de IA de hoje. Preenche o formulário à mão.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const remainingToday = this.dailyLimit - used;

    try {
      const content = await this.chat({
        system: buildSystemPrompt(now),
        user: message,
        json: true,
      });
      const draft = toDraft(JSON.parse(content) as unknown, now);
      return { ok: isUsable(draft), draft, remainingToday };
    } catch (err) {
      this.logger.warn(`parseGame falhou: ${(err as Error).message}`);
      return {
        ok: false,
        draft: { notes: 'A IA não respondeu. Preenche o formulário à mão.' },
        remainingToday,
      };
    }
  }

  private async remaining(userId: string, now: Date): Promise<number> {
    const rows: { count: number }[] = await this.dataSource.query(
      `SELECT "count" FROM "ai_usage" WHERE "userId" = $1 AND "day" = $2`,
      [userId, utcDay(now)],
    );
    return Math.max(0, this.dailyLimit - (rows[0]?.count ?? 0));
  }

  private async consume(userId: string, now: Date): Promise<number | null> {
    const rows: { count: number }[] = await this.dataSource.query(
      `INSERT INTO "ai_usage" ("userId", "day", "count") VALUES ($1, $2, 1)
       ON CONFLICT ("userId", "day") DO UPDATE SET "count" = "ai_usage"."count" + 1
         WHERE "ai_usage"."count" < $3
       RETURNING "count"`,
      [userId, utcDay(now), this.dailyLimit],
    );
    return rows[0]?.count ?? null;
  }
}
