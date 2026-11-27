import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { Env } from '../config.js';
import { AiService } from './ai.service.js';

/** O caso sem chave não se testa no e2e (a chave é lida quando a app arranca). */
describe('AiService sem GROQ_API_KEY', () => {
  it('não chama o Groq nem gasta a quota, e devolve ok:false', async () => {
    const queries: string[] = [];
    const dataSource = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        return [{ count: 4 }];
      }),
    } as unknown as DataSource;
    const config = {
      get: (key: keyof Env) =>
        ({ AI_DAILY_LIMIT: 10, GROQ_API_KEY: '', GROQ_MODEL: 'modelo' })[
          key as string
        ],
    } as unknown as ConfigService<Env, true>;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await new AiService(dataSource, config).parseGame(
      'u1',
      'Quinta às 21h no pavilhão',
    );

    expect(result).toMatchObject({ ok: false, remainingToday: 6 });
    expect(result.draft.notes).toMatch(/formulário/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(queries.every((q) => q.trimStart().startsWith('SELECT'))).toBe(true);
    fetchSpy.mockRestore();
  });
});

describe('AiService: limite diário', () => {
  const LIMIT = 10;
  const config = {
    get: (key: keyof Env) =>
      ({ AI_DAILY_LIMIT: LIMIT, GROQ_API_KEY: 'chave', GROQ_MODEL: 'modelo' })[
        key as string
      ],
  } as unknown as ConfigService<Env, true>;

  /** Simula a tabela ai_usage com a mesma regra do SQL: só soma abaixo do limite. */
  function usageTable(start: number) {
    let count = start;
    const calls: { sql: string; params: unknown[] }[] = [];
    const dataSource = {
      query: vi.fn(async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        const limit = params[2] as number;
        if (count >= limit) return [];
        count += 1;
        return [{ count }];
      }),
    } as unknown as DataSource;
    return { dataSource, calls, count: () => count };
  }

  const groqReply = () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ title: 'Futebolada' }) } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  afterEach(() => vi.restoreAllMocks());

  it('abaixo do limite: conta o pedido e diz quantos sobram', async () => {
    const table = usageTable(3);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(groqReply());

    const result = await new AiService(table.dataSource, config).parseGame(
      'u1',
      'Quinta às 21h',
    );

    expect(table.count()).toBe(4);
    expect(result.remainingToday).toBe(LIMIT - 4);
    // O limite vai para o SQL, que só soma enquanto o contador está abaixo dele.
    expect(table.calls[0]!.sql).toMatch(/WHERE "ai_usage"\."count" < \$3/);
    expect(table.calls[0]!.params[2]).toBe(LIMIT);
  });

  it('o 10.º pedido ainda passa; o 11.º é recusado sem subir o contador nem chamar o Groq', async () => {
    const table = usageTable(LIMIT - 1);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(groqReply());
    const ai = new AiService(table.dataSource, config);

    const last = await ai.parseGame('u1', 'Quinta às 21h');
    expect(last.remainingToday).toBe(0);
    expect(table.count()).toBe(LIMIT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 3; i++) {
      await expect(ai.parseGame('u1', 'Quinta às 21h')).rejects.toMatchObject({
        status: 429,
      });
    }
    expect(table.count()).toBe(LIMIT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
