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

/**
 * Criar um jogo a partir de uma mensagem colada. A IA nunca é obrigatória:
 * sem chave, sem quota ou se o Groq falhar, devolve ok:false e o formulário fica manual.
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

  async parseGame(
    userId: string,
    message: string,
    now = new Date(),
  ): Promise<ParseGameResultDto> {
    // Sem chave não há pedido ao Groq: não gasta a quota de ninguém.
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
    if (used > this.dailyLimit) {
      throw new HttpException(
        `Já usaste os ${this.dailyLimit} pedidos de IA de hoje. Preenche o formulário à mão.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const remainingToday = this.dailyLimit - used;

    try {
      const content = await this.chat(message, now);
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

  /**
   * Conta mais um pedido e devolve quantos já houve hoje, numa só instrução SQL.
   * Ler e depois gravar deixava dois pedidos ao mesmo tempo passar do limite
   * (ou chocar no índice único no primeiro pedido do dia).
   */
  private async consume(userId: string, now: Date): Promise<number> {
    const rows: { count: number }[] = await this.dataSource.query(
      `INSERT INTO "ai_usage" ("userId", "day", "count") VALUES ($1, $2, 1)
       ON CONFLICT ("userId", "day") DO UPDATE SET "count" = "ai_usage"."count" + 1
       RETURNING "count"`,
      [userId, utcDay(now)],
    );
    return rows[0]!.count;
  }

  private async chat(message: string, now: Date): Promise<string> {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt(now) },
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Só o estado: o corpo de erro pode repetir a mensagem do utilizador.
      throw new Error(`Groq respondeu ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq sem conteúdo');
    return content;
  }
}
