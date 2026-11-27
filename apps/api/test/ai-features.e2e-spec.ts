import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { App } from 'supertest/types.js';
import type { GameDetailDto } from '@convocados/shared';
import { confirmPath, rememberInvite } from './invites.js';

process.env.GROQ_API_KEY = 'chave-de-teste';
process.env.AI_DAILY_LIMIT = '5';

const urlOf = (input: string | URL | Request) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

describe('resultado, crónica IA e previsão (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();
  const realFetch = globalThis.fetch;
  let groqContent = 'Grande jogo! A equipa A venceu por 2-1 num Pavilhão a ferver.';

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!urlOf(input).startsWith('https://api.groq.com/'))
        return realFetch(input, init);
      return Response.json({
        choices: [{ message: { content: groqContent } }],
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

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_DAILY_LIMIT;
  });

  async function users(...names: string[]) {
    const out: Record<string, { token: string; id: string }> = {};
    for (const name of names) {
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({
          name,
          email: `${name}-${randomUUID()}@test.local`,
          password: 'password-de-teste',
        })
        .expect(201);
      out[name] = { token: res.body.token, id: res.body.user.id };
    }
    return out;
  }

  const as = (u: { token: string }) => {
    const auth = (r: request.Test) =>
      r.set('Authorization', `Bearer ${u.token}`);
    return {
      post: (path: string) => auth(request(server()).post(path)),
      patch: (path: string) => auth(request(server()).patch(path)),
      get: (path: string) => auth(request(server()).get(path)),
    };
  };

  async function start(gameId: string) {
    await app
      .get<DataSource>(getDataSourceToken())
      .query(
        `UPDATE "games" SET "startsAt" = now() - interval '1 hour' WHERE "id" = $1`,
        [gameId],
      );
  }

  it('resultado: só organizador depois do kick-off; perfil mostra V/D/E', async () => {
    const t = await users('Org', 'P1', 'P2', 'P3');
    const created = await as(t.Org!)
      .post('/games')
      .send({
        title: 'Futebolada',
        location: 'Pavilhão',
        startsAt: '2030-01-10T21:00:00.000Z',
        slots: 10,
        subs: 2,
        totalPriceCents: 0,
      })
      .expect(201);
    const id = rememberInvite(
      created.body as { id: string; inviteCode: string },
    ).id;
    for (const n of ['Org', 'P1', 'P2', 'P3']) {
      await as(t[n]!).post(confirmPath(id)).expect(200);
    }
    await as(t.Org!).post(`/games/${id}/teams`).send({ teamCount: 2 }).expect(200);

    await as(t.Org!)
      .patch(`/games/${id}/result`)
      .send({ scoreA: 2, scoreB: 1 })
      .expect(409);
    await as(t.P1!)
      .patch(`/games/${id}/result`)
      .send({ scoreA: 2, scoreB: 1 })
      .expect(403);

    await start(id);
    const res = await as(t.Org!)
      .patch(`/games/${id}/result`)
      .send({ scoreA: 2, scoreB: 1 })
      .expect(200);
    const detail = res.body as GameDetailDto;
    expect(detail.scoreA).toBe(2);
    expect(detail.scoreB).toBe(1);
    expect(detail.status).toBe('done');

    const profile = await as(t.Org!).get(`/users/${t.Org!.id}/profile`).expect(200);
    const recent = profile.body.stats.recentGames as { id: string; result: string }[];
    const mine = recent.find((g) => g.id === id);
    expect(mine?.result).toMatch(/^[VED] 2-1$/);
  });

  it('crónica IA: só organizador, exige resultado, gasta quota', async () => {
    const t = await users('Org', 'A', 'B');
    const created = await as(t.Org!)
      .post('/games')
      .send({
        title: 'Padelada',
        location: 'Club',
        startsAt: '2030-02-01T20:00:00.000Z',
        slots: 4,
        subs: 0,
        totalPriceCents: 0,
      })
      .expect(201);
    const id = rememberInvite(
      created.body as { id: string; inviteCode: string },
    ).id;
    await as(t.Org!).post(confirmPath(id)).expect(200);
    await as(t.A!).post(confirmPath(id)).expect(200);
    await as(t.B!).post(confirmPath(id)).expect(200);
    await start(id);

    await as(t.Org!).post(`/games/${id}/summary`).expect(409);
    await as(t.Org!)
      .patch(`/games/${id}/result`)
      .send({ scoreA: 6, scoreB: 4 })
      .expect(200);

    await as(t.A!).post(`/games/${id}/summary`).expect(403);
    const sum = await as(t.Org!).post(`/games/${id}/summary`).expect(200);
    expect(sum.body.ok).toBe(true);
    expect(sum.body.summary).toContain('Grande jogo');
    expect(sum.body.remainingToday).toBeLessThan(5);

    const detail = await as(t.A!).get(`/games/${id}/detail`).expect(200);
    expect((detail.body as GameDetailDto).summary).toContain('Grande jogo');
  });

  it('previsão de comparecimento: só o organizador', async () => {
    const t = await users('Org', 'P1');
    const created = await as(t.Org!)
      .post('/games')
      .send({
        title: 'Treino',
        location: 'Campo',
        startsAt: '2030-03-01T19:00:00.000Z',
        slots: 10,
        subs: 2,
        totalPriceCents: 0,
      })
      .expect(201);
    const id = rememberInvite(
      created.body as { id: string; inviteCode: string },
    ).id;
    await as(t.Org!).post(confirmPath(id)).expect(200);
    await as(t.P1!).post(confirmPath(id)).expect(200);

    await as(t.P1!).get(`/games/${id}/attendance-forecast`).expect(403);
    const forecast = await as(t.Org!)
      .get(`/games/${id}/attendance-forecast`)
      .expect(200);
    expect(forecast.body.neededPlayers).toBe(10);
    expect(forecast.body.players).toHaveLength(2);
    expect(forecast.body.riskOfNotFilling).toBe(true);
    for (const p of forecast.body.players) {
      expect(p.probability).toBeGreaterThanOrEqual(0);
      expect(p.probability).toBeLessThanOrEqual(1);
    }
  });
});
