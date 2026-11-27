import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { App } from 'supertest/types.js';
import type { ParseGameResultDto } from '@convocados/shared';

// URL de um pedido do fetch, seja string, URL ou Request.
const urlOf = (input: string | URL | Request) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

// A configuração é lida quando a app é importada: as variáveis vêm antes (import dinâmico).
process.env.GROQ_API_KEY = 'chave-de-teste';
process.env.AI_DAILY_LIMIT = '3';

type GroqCall = {
  body: { model: string; messages: { role: string; content: string }[] };
  auth: string;
};

/**
 * POST /ai/parse-game com o Groq simulado (nada sai para a internet).
 * Precisa do Postgres local (pnpm db:up) e do .env na raiz.
 */
describe('IA: criar jogo a partir de uma mensagem (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();
  const realFetch = globalThis.fetch;

  let calls: GroqCall[] = [];
  /** O que o "Groq" responde: conteúdo da mensagem, ou um estado HTTP de erro. */
  let groq: { content?: string; status?: number } = {};

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!urlOf(input).startsWith('https://api.groq.com/'))
        return realFetch(input, init);
      calls.push({
        body: JSON.parse(init?.body as string) as GroqCall['body'],
        auth: new Headers(init?.headers).get('authorization') ?? '',
      });
      if (groq.status)
        return new Response('erro do groq', { status: groq.status });
      return Response.json({
        choices: [{ message: { content: groq.content ?? '{}' } }],
      });
    });

    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    calls = [];
    groq = {};
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_DAILY_LIMIT;
  });

  async function user() {
    const res = await request(server())
      .post('/auth/mobile/register')
      .send({
        name: 'Org',
        email: `org-${randomUUID()}@test.local`,
        password: 'password-de-teste',
      })
      .expect(201);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const parse = (message: string) =>
      request(server())
        .post('/ai/parse-game')
        .set('Authorization', `Bearer ${token}`)
        .send({ message });
    return Object.assign(parse, { userId });
  }

  /** O contador de hoje gravado na base de dados. */
  async function usedToday(userId: string): Promise<number> {
    const rows: { count: number }[] = await app
      .get<DataSource>(getDataSourceToken())
      .query(`SELECT "count" FROM "ai_usage" WHERE "userId" = $1`, [userId]);
    return rows[0]?.count ?? 0;
  }

  const MESSAGE = 'Quinta às 21h no pavilhão de Arrifana, somos 10, campo 30€';

  it('preenche o formulário a partir da mensagem', async () => {
    groq.content = JSON.stringify({
      title: 'Futebolada de quinta',
      location: 'Pavilhão de Arrifana',
      date: '2030-01-10',
      time: '21:00',
      slots: 10,
      totalEuros: 30,
    });
    const parse = await user();
    const res = await parse(MESSAGE).expect(200);
    const body = res.body as ParseGameResultDto;

    expect(body).toEqual({
      ok: true,
      remainingToday: 2,
      draft: {
        title: 'Futebolada de quinta',
        location: 'Pavilhão de Arrifana',
        startsAt: '2030-01-10T21:00:00.000Z',
        slots: 10,
        totalPriceCents: 3000,
      },
    });

    // O pedido ao Groq: chave no cabeçalho, data de hoje no prompt, mensagem do utilizador.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.auth).toBe('Bearer chave-de-teste');
    expect(calls[0]!.body.messages[0]!.content).toMatch(
      /Hoje é \S+, \d{4}-\d{2}-\d{2}/,
    );
    expect(calls[0]!.body.messages[1]).toEqual({
      role: 'user',
      content: MESSAGE,
    });
  });

  it('resposta que não é JSON ou Groq em baixo: ok:false, a app continua', async () => {
    const parse = await user();
    groq.content = 'Claro! Aqui está o jogo: quinta às 21h';
    const bad = (await parse(MESSAGE).expect(200)).body as ParseGameResultDto;
    expect(bad.ok).toBe(false);
    expect(bad.draft.notes).toMatch(/formulário/);

    groq.status = 503;
    const down = (await parse(MESSAGE).expect(200)).body as ParseGameResultDto;
    expect(down).toMatchObject({ ok: false, remainingToday: 1 });
  });

  it('limite diário: o 4.º pedido dá 429, mesmo com pedidos ao mesmo tempo', async () => {
    groq.content = '{}';
    const parse = await user();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => parse(MESSAGE)),
    );
    const statuses = results.map((r) => r.status).sort((a, b) => a - b);
    expect(statuses).toEqual([200, 200, 200, 429, 429, 429]);
    expect(calls).toHaveLength(3);

    const blocked = results.find((r) => r.status === 429)!;
    expect(blocked.body.message).toContain('3 pedidos de IA');

    // Os pedidos recusados não contam: o contador fica no limite, não sobe para 6.
    expect(await usedToday(parse.userId)).toBe(3);
    await parse(MESSAGE).expect(429);
    expect(await usedToday(parse.userId)).toBe(3);
  });

  it('valida a mensagem e exige sessão', async () => {
    const parse = await user();
    await parse('curta').expect(400);
    await parse('x'.repeat(4001)).expect(400);
    await request(server())
      .post('/ai/parse-game')
      .send({ message: MESSAGE })
      .expect(401);
    expect(calls).toHaveLength(0);
  });
});
