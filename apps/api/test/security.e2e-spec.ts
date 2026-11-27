import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { DataSource } from 'typeorm';
import { PushToken } from '@convocados/db';
import type { GameDetailDto, GroupDto } from '@convocados/shared';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';

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
      delete: (path: string) => auth(request(server()).delete(path)),
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

  /** Cria o jogo e confirma os jogadores pelo convite (como quem abre o link). */
  async function gameOf(owner: U, ...confirmed: U[]) {
    const res = await as(owner).post('/games').send(newGame).expect(201);
    const game = rememberInvite(
      res.body as { id: string; inviteCode: string },
    );
    for (const u of confirmed) {
      await as(u).post(confirmPath(game.id)).expect(200);
    }
    return game;
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
        ['get', '/groups'],
        ['post', '/groups'],
        ['get', `/groups/${id}`],
        ['post', `/groups/${id}/leave`],
        ['delete', `/groups/${id}/members/${id}`],
        ['post', '/group-invites/000000000000/join'],
        ['get', '/venues'],
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
      const { id, inviteCode } = await gameOf(t.Org!, t.Vitima!);

      // Mesmo com o convite (acesso ao jogo), desistir só tira quem tem a sessão.
      await as(t.Intruso!)
        .post(`/games/${id}/leave?invite=${inviteCode}`)
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

  describe('acesso aos jogos: só quem tem lugar, grupo ou convite', () => {
    const notFound = async (path: string, u: U, method: 'get' | 'post') => {
      const res = await as(u)[method](path).expect(404);
      return res.body.message as string;
    };

    it('sem acesso: detalhe, jogo, confirmar e desistir dão 404 (igual a um jogo que não existe)', async () => {
      const t = await users('Org', 'A', 'Intruso');
      const { id } = await gameOf(t.Org!, t.A!);
      const other = await gameOf(t.Org!);
      const missing = await notFound(
        `/games/${randomUUID()}/detail`,
        t.Intruso!,
        'get',
      );

      for (const [method, path] of [
        ['get', `/games/${id}/detail`],
        ['get', `/games/${id}`],
        ['post', `/games/${id}/confirm`],
        ['post', `/games/${id}/leave`],
        // O código de outro jogo não abre este.
        ['get', `/games/${id}/detail?invite=${other.inviteCode}`],
        ['post', `/games/${id}/confirm?invite=${other.inviteCode}`],
        ['get', `/games/${id}/detail?invite=nao-e-codigo`],
      ] as const) {
        expect({ path, message: await notFound(path, t.Intruso!, method) }).toEqual(
          { path, message: missing },
        );
      }

      const detail = (await as(t.Org!).get(`/games/${id}/detail`).expect(200))
        .body as GameDetailDto;
      expect(detail.participations.map((p) => p.userId)).toEqual([t.A!.id]);
    });

    it('com acesso: organizador, confirmados, lista de espera e quem traz o convite', async () => {
      const t = await users('Org', 'A', 'B', 'Espera', 'Convidado');
      const res = await as(t.Org!)
        .post('/games')
        .send({ ...newGame, slots: 2, subs: 1 })
        .expect(201);
      const { id, inviteCode } = rememberInvite(
        res.body as { id: string; inviteCode: string },
      );
      for (const u of [t.A!, t.B!, t.Espera!]) {
        await as(u).post(confirmPath(id)).expect(200);
      }

      for (const u of [t.Org!, t.A!, t.B!, t.Espera!]) {
        await as(u).get(`/games/${id}/detail`).expect(200);
        await as(u).get(`/games/${id}`).expect(200);
      }

      // Convidado: sem código não vê; com o código (maiúsculas também) vê, e confirmar
      // pelo convite continua a funcionar (aqui o jogo está cheio: 409, não 404).
      await as(t.Convidado!).get(`/games/${id}/detail`).expect(404);
      await as(t.Convidado!)
        .get(`/games/${id}/detail?invite=${inviteCode.toUpperCase()}`)
        .expect(200);
      await as(t.Convidado!)
        .post(`/games/${id}/confirm?invite=${inviteCode}`)
        .expect(409);
    });

    it('quem desiste deixa de ter acesso pelo id, mas volta pelo convite', async () => {
      const t = await users('Org', 'A');
      const { id, inviteCode } = await gameOf(t.Org!, t.A!);

      await as(t.A!).post(`/games/${id}/leave`).expect(200);
      await as(t.A!).get(`/games/${id}/detail`).expect(404);
      await as(t.A!).post(`/games/${id}/confirm`).expect(404);

      const back = (
        await as(t.A!).post(`/games/${id}/confirm?invite=${inviteCode}`).expect(200)
      ).body as GameDetailDto;
      expect(back.participations.map((p) => p.userId)).toEqual([t.A!.id]);
    });

    it('jogos de um grupo: os membros veem e confirmam sem convite; quem sai do grupo deixa de ver', async () => {
      const t = await users('Org', 'Membro', 'Fora');
      const group = (
        await as(t.Org!)
          .post('/groups')
          .send({ name: 'Futebol de quinta', sport: 'football' })
          .expect(201)
      ).body as GroupDto;
      await as(t.Membro!)
        .post(`/group-invites/${group.inviteCode}/join`)
        .expect(200);
      const game = (
        await as(t.Org!)
          .post('/games')
          .send({ ...newGame, groupId: group.id })
          .expect(201)
      ).body as { id: string };

      await as(t.Membro!).get(`/games/${game.id}/detail`).expect(200);
      await as(t.Fora!).get(`/games/${game.id}/detail`).expect(404);
      await as(t.Fora!).post(`/games/${game.id}/confirm`).expect(404);

      await as(t.Membro!).post(`/games/${game.id}/confirm`).expect(200);
      await as(t.Membro!).post(`/games/${game.id}/leave`).expect(200);
      await as(t.Membro!).post(`/groups/${group.id}/leave`).expect(204);
      await as(t.Membro!).get(`/games/${game.id}/detail`).expect(404);
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
        .post(confirmPath(id))
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
    it('o convite público não mostra emails, hashes, pagamentos nem ids de utilizadores', async () => {
      const t = await users('Org', 'A');
      const { id, inviteCode } = await gameOf(t.Org!, t.Org!, t.A!);
      await as(t.Org!)
        .patch(`/games/${id}/participations/${t.A!.id}/paid`)
        .send({ paid: true })
        .expect(200);

      const res = await request(server())
        .get(`/invites/${inviteCode}`)
        .expect(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('@');
      expect(body).not.toMatch(/password|hash|token|email/i);
      expect(body).not.toMatch(/"paid"/);
      expect(body).not.toContain(t.A!.id);
      expect(body).not.toContain(t.Org!.id);
      expect(body).not.toContain(inviteCode);
      expect(Object.keys(res.body).sort()).toEqual(
        [
          'confirmedCount',
          'id',
          'location',
          'players',
          'slots',
          'sport',
          'startsAt',
          'status',
          'subs',
          'title',
          'totalPriceCents',
          'waitingCount',
        ].sort(),
      );
      expect(res.body.players).toEqual([
        { name: 'Org', status: 'confirmed' },
        { name: 'A', status: 'confirmed' },
      ]);
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
