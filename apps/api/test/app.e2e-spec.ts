import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Precisa do Postgres local (pnpm db:up) e do .env na raiz.
describe('API (e2e)', () => {
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

  it('GET /health responde ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /games sem sessão dá 401', () => {
    return request(app.getHttpServer()).get('/games').expect(401);
  });

  describe('editar jogo', () => {
    const newUser = async (name: string) => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/register')
        .send({ name, email: `${name}-${randomUUID()}@test.local`, password: 'password-de-teste' })
        .expect(201);
      return agent;
    };

    const game = {
      title: 'Futebolada',
      location: 'Pavilhão',
      startsAt: '2026-12-03T21:00:00.000Z',
      slots: 10,
      subs: 2,
      totalPriceCents: 3000,
    };

    it('o organizador edita; outro jogador leva 403; id inválido dá 400', async () => {
      const organizer = await newUser('org');
      const created = await organizer.post('/games').send(game).expect(201);
      const id: string = created.body.id;

      const updated = await organizer
        .patch(`/games/${id}`)
        .send({ title: 'Futebolada de quinta', totalPriceCents: 3600 })
        .expect(200);
      expect(updated.body).toMatchObject({ title: 'Futebolada de quinta', totalPriceCents: 3600, slots: 10 });

      const other = await newUser('outro');
      await other.patch(`/games/${id}`).send({ title: 'x' }).expect(403);
      await other.get(`/games/${id}`).expect(200);

      await organizer.patch('/games/nao-e-uuid').send({ title: 'x' }).expect(400);
      await organizer.patch(`/games/${id}`).send({ slots: 1 }).expect(400);
    });
  });
});
