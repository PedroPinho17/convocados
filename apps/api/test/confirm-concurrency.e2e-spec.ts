import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';

// Precisa do Postgres local (pnpm db:up) e do .env na raiz.
describe('confirm concurrency (e2e)', () => {
  let app: INestApplication<App>;

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

  it(
    '20 confirms em paralelo: no máximo slots confirmed e slots+subs no total',
    async () => {
      const server = app.getHttpServer();
      const password = 'password-de-teste';

      const tokens = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const res = await request(server)
            .post('/auth/mobile/register')
            .send({
              name: `Jogador${i}`,
              email: `c20-${i}-${randomUUID()}@test.local`,
              password,
            })
            .expect(201);
          return res.body.token as string;
        }),
      );

      const created = await request(server)
        .post('/games')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          title: 'Corrida às vagas',
          location: 'Pavilhão',
          startsAt: '2026-12-15T21:00:00.000Z',
          slots: 5,
          subs: 3,
          totalPriceCents: 3000,
        })
        .expect(201);

      const gameId = rememberInvite(
        created.body as { id: string; inviteCode: string },
      ).id;

      const results = await Promise.all(
        tokens.map((token) =>
          request(server)
            .post(confirmPath(gameId))
            .set('Authorization', `Bearer ${token}`),
        ),
      );

      const ok = results.filter((r) => r.status === 200);
      const full = results.filter((r) => r.status === 409);

      expect(ok).toHaveLength(8); // 5 confirmed + 3 waiting
      expect(full).toHaveLength(12);

      const detail = await request(server)
        .get(`/games/${gameId}/detail`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(detail.body.confirmedCount).toBe(5);
      expect(detail.body.waitingCount).toBe(3);
      expect(detail.body.confirmedCount).toBeLessThanOrEqual(5);
      expect(detail.body.confirmedCount + detail.body.waitingCount).toBe(8);
    },
    120_000,
  );
});