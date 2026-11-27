import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { DataSource } from 'typeorm';
import { Rating } from '@convocados/db';
import type { GameDetailDto } from '@convocados/shared';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';

// Precisa do Postgres local (pnpm db:up) e do .env na raiz.
describe('pagamentos, avaliações e equipas (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Cria contas; devolve token e id por nome. */
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

  async function gameWith(
    t: Record<string, { token: string; id: string }>,
    org: string,
    confirmed: string[],
    slots = 10,
    subs = 2,
  ) {
    const res = await as(t[org]!)
      .post('/games')
      .send({
        title: 'Futebolada',
        location: 'Pavilhão',
        startsAt: '2030-01-10T21:00:00.000Z',
        slots,
        subs,
        totalPriceCents: 3000,
      })
      .expect(201);
    const id = rememberInvite(
      res.body as { id: string; inviteCode: string },
    ).id;
    for (const n of confirmed) {
      await as(t[n]!).post(confirmPath(id)).expect(200);
    }
    return id;
  }

  /** Põe o jogo a começar há 1 h (só se avalia depois de o jogo começar). */
  async function start(gameId: string) {
    await app
      .get<DataSource>(getDataSourceToken())
      .query(
        `UPDATE "games" SET "startsAt" = now() - interval '1 hour' WHERE "id" = $1`,
        [gameId],
      );
  }

  describe('pagamentos', () => {
    it('só o organizador marca, e só jogadores confirmados', async () => {
      const t = await users('Org', 'B', 'C');
      const id = await gameWith(t, 'Org', ['Org', 'B', 'C'], 2, 1); // C fica em espera
      const paidUrl = (u: string) => `/games/${id}/participations/${u}/paid`;

      await as(t.B!).patch(paidUrl(t.B!.id)).send({ paid: true }).expect(403);
      await as(t.Org!).patch(paidUrl(t.C!.id)).send({ paid: true }).expect(409);
      await as(t.Org!)
        .patch(paidUrl(randomUUID()))
        .send({ paid: true })
        .expect(404);
      await as(t.Org!)
        .patch(paidUrl(t.B!.id))
        .send({ paid: 'sim' })
        .expect(400);

      const res = await as(t.Org!)
        .patch(paidUrl(t.B!.id))
        .send({ paid: true })
        .expect(200);
      const detail = res.body as GameDetailDto;
      expect(
        detail.participations.find((p) => p.userId === t.B!.id)?.paid,
      ).toBe(true);

      const back = await as(t.Org!)
        .patch(paidUrl(t.B!.id))
        .send({ paid: false })
        .expect(200);
      expect(
        (back.body as GameDetailDto).participations.find(
          (p) => p.userId === t.B!.id,
        )?.paid,
      ).toBe(false);
    });
  });

  describe('avaliações', () => {
    it('só depois de o jogo começar', async () => {
      const t = await users('A', 'B');
      const id = await gameWith(t, 'A', ['A', 'B']);

      const early = await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.B!.id, score: 4 })
        .expect(409);
      expect(early.body.message).toContain('depois de o jogo começar');

      await start(id);
      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.B!.id, score: 4 })
        .expect(201);
    });

    it('não te avalias a ti próprio; só entre confirmados', async () => {
      const t = await users('A', 'B', 'Fora');
      const id = await gameWith(t, 'A', ['A', 'B']);
      await start(id);

      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.A!.id, score: 5 })
        .expect(400);
      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.Fora!.id, score: 3 })
        .expect(409);
      await as(t.Fora!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.A!.id, score: 3 })
        .expect(409);
      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.B!.id, score: 6 })
        .expect(400);
    });

    it('avaliar outra vez atualiza a nota em vez de duplicar', async () => {
      const t = await users('A', 'B');
      const id = await gameWith(t, 'A', ['A', 'B']);
      await start(id);

      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.B!.id, score: 2 })
        .expect(201);
      const res = await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.B!.id, score: 4 })
        .expect(201);
      expect(res.body.score).toBe(4);

      const mine = await as(t.A!).get(`/games/${id}/ratings`).expect(200);
      expect(mine.body).toHaveLength(1);
      expect(mine.body[0].score).toBe(4);
    });

    it('vários pedidos ao mesmo tempo não dão erro nem duplicam', async () => {
      const t = await users('A', 'B');
      const id = await gameWith(t, 'A', ['A', 'B']);
      await start(id);

      const results = await Promise.all(
        [1, 2, 3, 4, 5, 1, 2, 3].map((score) =>
          as(t.A!)
            .post(`/games/${id}/ratings`)
            .send({ toUserId: t.B!.id, score }),
        ),
      );
      expect(results.map((r) => r.status)).toEqual(Array(8).fill(201));

      const ratings = app
        .get<DataSource>(getDataSourceToken())
        .getRepository(Rating);
      expect(await ratings.countBy({ gameId: id, fromUserId: t.A!.id })).toBe(
        1,
      );
    });

    it('as avaliações são privadas: cada um só vê as que deu', async () => {
      const t = await users('A', 'B', 'C');
      const id = await gameWith(t, 'A', ['A', 'B', 'C']);
      await start(id);
      await as(t.A!)
        .post(`/games/${id}/ratings`)
        .send({ toUserId: t.C!.id, score: 5 })
        .expect(201);

      const ofB = await as(t.B!).get(`/games/${id}/ratings`).expect(200);
      expect(ofB.body).toEqual([]);
    });
  });

  describe('equipas', () => {
    it('só o organizador gera; ficam guardadas no detalhe do jogo, sem avaliações', async () => {
      const t = await users('Org', 'P1', 'P2', 'P3', 'P4', 'P5');
      const id = await gameWith(t, 'Org', [
        'Org',
        'P1',
        'P2',
        'P3',
        'P4',
        'P5',
      ]);

      await as(t.P1!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 2 })
        .expect(403);
      await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 5 })
        .expect(400);

      const res = await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({})
        .expect(200);
      const detail = res.body as GameDetailDto;
      expect(detail.teams.map((x) => x.name)).toEqual(['A', 'B']);
      expect(detail.teams.map((x) => x.players.length)).toEqual([3, 3]);
      expect(detail.teamsBalance).toMatchObject({
        difference: expect.any(Number),
        explanation: expect.stringMatching(/^Diferença de /),
      });
      for (const team of detail.teams) {
        expect(team.totalStrength).toEqual(expect.any(Number));
        for (const p of team.players) {
          expect(p).toMatchObject({
            userId: expect.any(String),
            name: expect.any(String),
            strength: expect.any(Number),
            preferredPosition: null,
          });
        }
      }
      expect(JSON.stringify(detail)).not.toMatch(/@test\.local/);

      // Outro jogador vê as mesmas equipas.
      const seen = await as(t.P3!).get(`/games/${id}/detail`).expect(200);
      expect((seen.body as GameDetailDto).teams).toEqual(detail.teams);
      expect((seen.body as GameDetailDto).teamsBalance).toEqual(
        detail.teamsBalance,
      );

      // Mesma semente → mesmas equipas; outra semente → pedido aceite.
      const again = await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ seed: 42 })
        .expect(200);
      expect((again.body as GameDetailDto).teams).toHaveLength(2);
      await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ seed: 99 })
        .expect(200);
    });

    it('equipas com o mesmo tamanho mesmo com um jogador muito mais forte', async () => {
      const names = [
        'Org',
        'J1',
        'J2',
        'J3',
        'J4',
        'J5',
        'J6',
        'J7',
        'J8',
        'J9',
      ];
      const t = await users(...names);
      const id = await gameWith(t, 'Org', names);
      await start(id);
      // Toda a gente dá 5 ao Org e 1 aos outros.
      for (const rater of names) {
        for (const rated of names) {
          if (rater === rated) continue;
          await as(t[rater]!)
            .post(`/games/${id}/ratings`)
            .send({ toUserId: t[rated]!.id, score: rated === 'Org' ? 5 : 1 })
            .expect(201);
        }
      }

      const res = await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 2 })
        .expect(200);
      expect(
        (res.body as GameDetailDto).teams.map((x) => x.players.length),
      ).toEqual([5, 5]);
    });

    it('quem desiste sai da equipa; quem confirma depois fica sem equipa até atualizar', async () => {
      const t = await users('Org', 'A', 'B', 'C', 'D');
      const id = await gameWith(t, 'Org', ['Org', 'A', 'B', 'C']);
      await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 2 })
        .expect(200);

      await as(t.A!).post(`/games/${id}/leave`).expect(200);
      const res = await as(t.D!).post(confirmPath(id)).expect(200);
      const players = (res.body as GameDetailDto).teams.flatMap((x) =>
        x.players.map((p) => p.userId),
      );
      expect(players).not.toContain(t.A!.id);
      expect(players).not.toContain(t.D!.id);
      expect(players).toHaveLength(3);

      const updated = await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 2 })
        .expect(200);
      expect(
        (updated.body as GameDetailDto).teams.flatMap((x) =>
          x.players.map((p) => p.userId),
        ),
      ).toContain(t.D!.id);
    });

    it('precisa de confirmados suficientes', async () => {
      const t = await users('Org');
      const id = await gameWith(t, 'Org', ['Org']);
      await as(t.Org!)
        .post(`/games/${id}/teams`)
        .send({ teamCount: 2 })
        .expect(409);
    });
  });
});
