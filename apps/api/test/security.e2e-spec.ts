import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { DataSource } from 'typeorm';
import { PushToken } from '@convocados/db';
import type { GameDetailDto } from '@convocados/shared';
import { AppModule } from './../src/app.module.js';

/**
 * Segurança num só sítio: autenticação, autorização (ninguém mexe no que não é seu),
 * campos que o cliente não pode escolher, e dados que nunca saem da API.
 * Precisa do Postgres local (pnpm db:up) e do .env na raiz.
 */
describe('segurança (e2e)', () => {
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

  type U = { token: string; id: string; email: string };
  async function users(...names: string[]) {
    const out: Record<string, U> = {};
    for (const name of names) {
      const email = `${name.toLowerCase()}-${randomUUID()}@test.local`;
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({ name, email, password: 'password-de-teste' })
        .expect(201);
      out[name] = { token: res.body.token, id: res.body.user.id, email };
    }
    return out;
  }

  const as = (u: U) => {
    const auth = (r: request.Test) =>
      r.set('Authorization', `Bearer ${u.token}`);
    return {
      get: (path: string) => auth(request(server()).get(path)),
      post: (path: string) => auth(request(server()).post(path)),
      patch: (path: string) => auth(request(server()).patch(path)),
      put: (path: string) => auth(request(server()).put(path)),
    };
  };

  const newGame = {
    title: 'Futebolada',
    location: 'Pavilhão',
    startsAt: '2030-01-10T21:00:00.000Z',
    slots: 10,
    subs: 2,
    totalPriceCents: 3000,
  };

  async function gameOf(owner: U, ...confirmed: U[]) {
    const res = await as(owner).post('/games').send(newGame).expect(201);
    for (const u of confirmed) {
      await as(u).post(`/games/${res.body.id}/confirm`).expect(200);
    }
    return res.body as { id: string; inviteCode: string };
  }

  describe('autenticação', () => {
    it('todas as rotas privadas exigem sessão', async () => {
      const id = randomUUID();
      const routes: [string, string][] = [
        ['get', '/auth/me'],
        ['get', '/games'],
        ['post', '/games'],
        ['get', `/games/${id}`],
        ['patch', `/games/${id}`],
        ['get', `/games/${id}/detail`],
        ['post', `/games/${id}/confirm`],
        ['post', `/games/${id}/leave`],
        ['patch', `/games/${id}/participations/${id}/paid`],
        ['get', `/games/${id}/ratings`],
        ['post', `/games/${id}/ratings`],
        ['post', `/games/${id}/teams`],
        ['post', '/push/register'],
        ['post', '/push/unregister'],
        ['get', '/push/reminders'],
        ['put', '/push/reminders'],
        ['post', '/ai/parse-game'],
        ['post', `/games/${id}/cancel`],
        ['delete', '/account'],
        ['get', '/auth/socket-token'],
      ];
      for (const [method, path] of routes) {
        const res = await (
          request(server()) as unknown as Record<
            string,
            (p: string) => request.Test
          >
        )[method]!(path);
        expect({ method, path, status: res.status }).toEqual({
          method,
          path,
          status: 401,
        });
      }
    });

    it('tokens inválidos, mal formados ou depois do logout são recusados', async () => {
      const t = await users('A');
      for (const bad of ['x'.repeat(43), 'nao-e-um-token', `${t.A!.token}x`]) {
        await request(server())
          .get('/auth/me')
          .set('Authorization', `Bearer ${bad}`)
          .expect(401);
      }
      await as(t.A!).post('/auth/logout').expect(204);
      await as(t.A!).get('/auth/me').expect(401);
    });

    it('login com password errada e email inexistente dão a mesma resposta', async () => {
      const t = await users('A');
      const wrongPass = await request(server())
        .post('/auth/mobile/login')
        .send({ email: t.A!.email, password: 'password-errada' })
        .expect(401);
      const noUser = await request(server())
        .post('/auth/mobile/login')
        .send({
          email: `ninguem-${randomUUID()}@test.local`,
          password: 'password-errada',
        })
        .expect(401);
      expect(wrongPass.body.message).toBe(noUser.body.message);
    });
  });

  describe('autorização: ninguém mexe no que não é seu', () => {
    it('só o organizador edita o jogo, marca pagamentos e faz equipas', async () => {
      const t = await users('Org', 'Intruso');
      const { id } = await gameOf(t.Org!, t.Org!, t.Intruso!);

      await as(t.Intruso!)
        .patch(`/games/${id}`)
        .send({ slots: 30 })
        .expect(403);
      await as(t.Intruso!)
        .patch(`/games/${id}/participations/${t.Intruso!.id}/paid`)
        .send({ paid: true })
        .expect(403);
      await as(t.Intruso!).post(`/games/${id}/teams`).send({}).expect(403);

      const detail = (await as(t.Org!).get(`/games/${id}/detail`).expect(200))
        .body as GameDetailDto;
      expect(detail.slots).toBe(10);
      expect(detail.participations.every((p) => !p.paid)).toBe(true);
      expect(detail.teams).toEqual([]);
    });

    it('confirmar e desistir só valem para quem tem a sessão (userId no pedido é ignorado)', async () => {
      const t = await users('Org', 'Vitima', 'Intruso');
      const { id } = await gameOf(t.Org!, t.Vitima!);

      await as(t.Intruso!)
        .post(`/games/${id}/leave`)
        .send({ userId: t.Vitima!.id })
        .expect(200);
      const detail = (await as(t.Org!).get(`/games/${id}/detail`).expect(200))
        .body as GameDetailDto;
      expect(detail.participations.map((p) => p.userId)).toEqual([
        t.Vitima!.id,
      ]);
    });

    it('não se apaga o token de push de outra pessoa', async () => {
      const t = await users('A', 'B');
      const token = `ExponentPushToken[${randomUUID()}]`;
      await as(t.A!).post('/push/register').send({ token }).expect(204);

      await as(t.B!).post('/push/unregister').send({ token }).expect(204);
      const tokens = app
        .get<DataSource>(getDataSourceToken())
        .getRepository(PushToken);
      expect(await tokens.findOneBy({ token })).toMatchObject({
        userId: t.A!.id,
      });
    });

    it('os lembretes de cada um só mostram os seus jogos', async () => {
      const t = await users('A', 'B');
      await gameOf(t.A!, t.A!);
      const ofB = await as(t.B!).get('/push/reminders').expect(200);
      expect(ofB.body.games).toEqual([]);
    });
  });

  describe('campos que o cliente não escolhe', () => {
    it('criar ou editar um jogo ignora organizador, código de convite e estado enviados', async () => {
      const t = await users('Org', 'Outro');
      const created = await as(t.Org!)
        .post('/games')
        .send({
          ...newGame,
          organizerId: t.Outro!.id,
          inviteCode: 'aaaaaaaaaaaa',
          status: 'done',
        })
        .expect(201);
      expect(created.body.organizerId).toBe(t.Org!.id);
      expect(created.body.inviteCode).not.toBe('aaaaaaaaaaaa');
      expect(created.body.status).toBe('open');

      const edited = await as(t.Org!)
        .patch(`/games/${created.body.id}`)
        .send({ organizerId: t.Outro!.id, inviteCode: 'bbbbbbbbbbbb' })
        .expect(200);
      expect(edited.body.organizerId).toBe(t.Org!.id);
      expect(edited.body.inviteCode).toBe(created.body.inviteCode);
    });

    it('confirmar não deixa escolher o estado, a posição nem marcar-se como pago', async () => {
      const t = await users('Org', 'A');
      const { id } = await gameOf(t.Org!);
      const res = await as(t.A!)
        .post(`/games/${id}/confirm`)
        .send({ status: 'confirmed', position: 0, paid: true })
        .expect(200);
      const mine = (res.body as GameDetailDto).participations.find(
        (p) => p.userId === t.A!.id,
      );
      expect(mine).toMatchObject({
        status: 'confirmed',
        paid: false,
        position: 1,
      });
    });
  });

  describe('dados que nunca saem da API', () => {
    it('o convite público não mostra emails nem hashes', async () => {
      const t = await users('Org', 'A');
      const { inviteCode } = await gameOf(t.Org!, t.Org!, t.A!);
      const res = await request(server())
        .get(`/invites/${inviteCode}`)
        .expect(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('@');
      expect(body).not.toMatch(/password|hash|token|email/i);
    });

    it('nenhuma resposta da conta traz a password ou o hash', async () => {
      const email = `seguro-${randomUUID()}@test.local`;
      const reg = await request(server())
        .post('/auth/mobile/register')
        .send({ name: 'Seguro', email, password: 'password-de-teste' })
        .expect(201);
      const me = await request(server())
        .get('/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .expect(200);
      for (const body of [reg.body.user, me.body]) {
        expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name']);
      }
    });

    it('a web recebe a sessão num cookie httpOnly, nunca no corpo da resposta', async () => {
      const res = await request(server())
        .post('/auth/register')
        .send({
          name: 'Web',
          email: `web-${randomUUID()}@test.local`,
          password: 'password-de-teste',
        })
        .expect(201);
      expect(res.body.token).toBeUndefined();
      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });
  });

  describe('entradas inválidas', () => {
    it('ids e códigos mal formados dão 400/404, nunca 500', async () => {
      const t = await users('A');
      await as(t.A!).get('/games/nao-e-uuid/detail').expect(400);
      await as(t.A!).post("/games/1' OR '1'='1/confirm").expect(400);
      await request(server()).get("/invites/' OR 1=1 --").expect(404);
      await as(t.A!).get(`/games/${randomUUID()}/detail`).expect(404);
    });

    it('corpos que não cumprem o schema dão 400', async () => {
      const t = await users('A');
      await as(t.A!)
        .post('/games')
        .send({ ...newGame, slots: 1000 })
        .expect(400);
      await as(t.A!)
        .post('/games')
        .send({ ...newGame, title: '' })
        .expect(400);
      await as(t.A!)
        .put('/push/reminders')
        .send({ reminderMinutes: [1] })
        .expect(400);
      await as(t.A!)
        .post('/push/register')
        .send({ token: 'qualquer-coisa' })
        .expect(400);
    });
  });
});
