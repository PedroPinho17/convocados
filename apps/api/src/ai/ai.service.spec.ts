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
