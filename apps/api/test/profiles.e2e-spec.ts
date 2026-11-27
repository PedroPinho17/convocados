import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';

describe('perfil do jogador (e2e)', () => {
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

  async function users(...names: string[]) {
    const out: Record<string, { token: string; id: string; email: string }> =
      {};
    for (const name of names) {
      const email = `${name}-${randomUUID()}@test.local`;
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({
          name,
          email,
          password: 'password-de-teste',
        })
        .expect(201);
      out[name] = { token: res.body.token, id: res.body.user.id, email };
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

  it('GET/PATCH /me/profile: ler, editar e validar', async () => {
    const t = await users('Ana');
    const mine = await as(t.Ana!).get('/me/profile').expect(200);
    expect(mine.body).toMatchObject({
      id: t.Ana!.id,
      displayName: 'Ana',
      initials: 'A',
      preferredPosition: null,
      preferredFoot: null,
      city: null,
      bio: null,
      stats: {
        gamesPlayed: 0,
        gamesOrganized: 0,
        averageRating: null,
        ratingsCount: 0,
        recentGames: [],
      },
    });
    expect(mine.body).not.toHaveProperty('email');

    const updated = await as(t.Ana!)
      .patch('/me/profile')
      .send({
        displayName: 'Ana Silva',
        preferredPosition: 'MID',
        preferredFoot: 'BOTH',
        city: 'Porto',
        bio: 'Médio de construção.',
      })
      .expect(200);

    expect(updated.body).toMatchObject({
      displayName: 'Ana Silva',
      initials: 'AS',
      preferredPosition: 'MID',
      preferredFoot: 'BOTH',
      city: 'Porto',
      bio: 'Médio de construção.',
    });
    expect(updated.body).not.toHaveProperty('email');

    await as(t.Ana!)
      .patch('/me/profile')
      .send({ preferredPosition: 'WINGER' })
      .expect(400);

    await as(t.Ana!)
      .patch('/me/profile')
      .send({ preferredFoot: 'CENTER' })
      .expect(400);

    await as(t.Ana!)
      .patch('/me/profile')
      .send({ displayName: '' })
      .expect(400);

    await as(t.Ana!)
      .patch('/me/profile')
      .send({ city: 'x'.repeat(81) })
      .expect(400);

    await as(t.Ana!)
      .patch('/me/profile')
      .send({ bio: 'x'.repeat(281) })
      .expect(400);
  });

  it('GET /users/:id/profile: público sem email + stats de jogos e avaliações', async () => {
    const t = await users('Org', 'B');
    const created = await as(t.Org!)
      .post('/games')
      .send({
        title: 'Futebolada',
        location: 'Pavilhão',
        startsAt: '2030-01-10T21:00:00.000Z',
        slots: 10,
        subs: 2,
        totalPriceCents: 3000,
      })
      .expect(201);
    const gameId = rememberInvite(
      created.body as { id: string; inviteCode: string },
    ).id;
    await as(t.Org!).post(confirmPath(gameId)).expect(200);
    await as(t.B!).post(confirmPath(gameId)).expect(200);
    await start(gameId);

    await as(t.Org!)
      .post(`/games/${gameId}/ratings`)
      .send({ toUserId: t.B!.id, score: 5 })
      .expect(201);
    await as(t.Org!)
      .post(`/games/${gameId}/ratings`)
      .send({ toUserId: t.B!.id, score: 3 })
      .expect(201);

    const pub = await as(t.Org!)
      .get(`/users/${t.B!.id}/profile`)
      .expect(200);

    expect(pub.body).toMatchObject({
      id: t.B!.id,
      displayName: 'B',
      stats: {
        gamesPlayed: 1,
        gamesOrganized: 0,
        averageRating: 3,
        ratingsCount: 1,
      },
    });
    expect(pub.body.stats.recentGames).toHaveLength(1);
    expect(pub.body.stats.recentGames[0]).toMatchObject({
      id: gameId,
      venueName: 'Pavilhão',
      result: null,
    });
    expect(pub.body).not.toHaveProperty('email');
    expect(JSON.stringify(pub.body)).not.toContain(t.B!.email);

    const orgProfile = await as(t.B!)
      .get(`/users/${t.Org!.id}/profile`)
      .expect(200);
    expect(orgProfile.body.stats.gamesOrganized).toBe(1);
    expect(orgProfile.body.stats.gamesPlayed).toBe(1);
    expect(JSON.stringify(orgProfile.body)).not.toContain(t.Org!.email);

    await as(t.Org!)
      .get(`/users/${randomUUID()}/profile`)
      .expect(404);

    await request(server()).get(`/users/${t.B!.id}/profile`).expect(401);
  });
});
