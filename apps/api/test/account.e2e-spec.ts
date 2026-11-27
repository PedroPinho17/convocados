import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { io } from 'socket.io-client';
import type { DataSource } from 'typeorm';
import type { GameDetailDto, RemindersDto } from '@convocados/shared';
import { confirmPath, rememberInvite } from './invites.js';

// URL de um pedido do fetch, seja string, URL ou Request.
const urlOf = (input: string | URL | Request) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

// A configuração é lida quando a app é importada: as variáveis vêm antes (import dinâmico).
process.env.RESEND_API_KEY = 'chave-resend-de-teste';
process.env.APP_URL = 'https://convocados.test';

type Mail = { to: string[]; subject: string; text: string };
type Push = { to: string; title: string; body: string };

/**
 * Conta e jogo: recuperar a password, token do socket da web, cancelar o jogo e
 * apagar a conta. Resend e Expo simulados (nada sai para a internet).
 * Precisa do Postgres local (pnpm db:up) e do .env na raiz.
 */
describe('conta, password e cancelar jogos (e2e)', () => {
  let app: INestApplication<App>;
  let url: string;
  const server = () => app.getHttpServer();
  const realFetch = globalThis.fetch;
  let mails: Mail[] = [];
  let pushes: Push[] = [];

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const target = urlOf(input);
      if (target.startsWith('https://api.resend.com/')) {
        mails.push(JSON.parse(init?.body as string) as Mail);
        return Response.json({ id: randomUUID() });
      }
      if (target.startsWith('https://exp.host/')) {
        const sent = JSON.parse(init?.body as string) as Push[];
        pushes.push(...sent);
        return Response.json({
          data: sent.map(() => ({ status: 'ok', id: 'x' })),
        });
      }
      return realFetch(input, init);
    });

    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.listen(0, '127.0.0.1');
    const address = (
      server() as unknown as HttpServer
    ).address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    mails = [];
    pushes = [];
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.APP_URL;
  });

  type U = { token: string; id: string; email: string };
  async function users(...names: string[]) {
    const out: Record<string, U> = {};
    for (const name of names) {
      const email = `${name.toLowerCase()}-${randomUUID()}@test.local`;
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({ name, email, password: 'password-antiga' })
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
      delete: (path: string) => auth(request(server()).delete(path)),
    };
  };

  const login = (email: string, password: string) =>
    request(server()).post('/auth/mobile/login').send({ email, password });

  async function game(owner: U, slots = 10, subs = 2) {
    const res = await as(owner)
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
    return rememberInvite(res.body as { id: string; inviteCode: string }).id;
  }

  async function device(u: U) {
    const token = `ExponentPushToken[${randomUUID()}]`;
    await as(u).post('/push/register').send({ token }).expect(204);
    return token;
  }

  /** Tira o token do link do último email. */
  const tokenFromMail = (m: Mail) => /token=([\w-]{43})/.exec(m.text)![1]!;
  const mailsTo = (email: string) => mails.filter((m) => m.to.includes(email));
  // O email é enviado sem esperar pela resposta: esperar que chegue.
  const nextMail = async (email: string) => {
    await vi.waitFor(() => expect(mailsTo(email)).toHaveLength(1));
    return mailsTo(email)[0]!;
  };

  describe('recuperar a password', () => {
    it('envia o link, a password nova funciona, a antiga e as sessões não', async () => {
      const t = await users('Ana');
      await request(server())
        .post('/auth/password/forgot')
        .send({ email: t.Ana!.email.toUpperCase() })
        .expect(204);

      const mail = await nextMail(t.Ana!.email);
      expect(mail.subject).toBe('Repor a password do Convocados');
      expect(mail.text).toContain(
        'https://convocados.test/reset-password?token=',
      );

      await request(server())
        .post('/auth/password/reset')
        .send({ token: tokenFromMail(mail), password: 'password-nova-123' })
        .expect(204);

      await login(t.Ana!.email, 'password-antiga').expect(401);
      await login(t.Ana!.email, 'password-nova-123').expect(200);
      // A sessão de antes foi terminada.
      await as(t.Ana!).get('/auth/me').expect(401);
    });

    it('email desconhecido: mesma resposta e nenhum email', async () => {
      await request(server())
        .post('/auth/password/forgot')
        .send({ email: `ninguem-${randomUUID()}@test.local` })
        .expect(204);
      await new Promise((r) => setTimeout(r, 100));
      expect(mails).toEqual([]);
    });

    it('o link só serve uma vez, e um pedido novo anula o anterior', async () => {
      const t = await users('Rui');
      const forgot = () =>
        request(server())
          .post('/auth/password/forgot')
          .send({ email: t.Rui!.email })
          .expect(204);

      await forgot();
      const first = tokenFromMail(await nextMail(t.Rui!.email));
      mails = [];
      await forgot();
      const second = tokenFromMail(await nextMail(t.Rui!.email));

      const reset = (token: string) =>
        request(server())
          .post('/auth/password/reset')
          .send({ token, password: 'password-nova-123' });
      await reset(first).expect(400);
      await reset(second).expect(204);
      await reset(second).expect(400);
    });

    it('link expirado não serve', async () => {
      const t = await users('Ze');
      await request(server())
        .post('/auth/password/forgot')
        .send({ email: t.Ze!.email })
        .expect(204);
      const token = tokenFromMail(await nextMail(t.Ze!.email));
      await app
        .get<DataSource>(getDataSourceToken())
        .query(
          `UPDATE "password_resets" SET "expiresAt" = now() - interval '1 minute' WHERE "userId" = $1`,
          [t.Ze!.id],
        );
      await request(server())
        .post('/auth/password/reset')
        .send({ token, password: 'password-nova-123' })
        .expect(400);
    });

    it('a password nova tem de ter 10 caracteres; tokens mal formados dão 400', async () => {
      await request(server())
        .post('/auth/password/reset')
        .send({ token: 'a'.repeat(43), password: 'curta' })
        .expect(400);
      await request(server())
        .post('/auth/password/reset')
        .send({ token: 'nao-e-um-token', password: 'password-nova-123' })
        .expect(400);
    });
  });

  describe('token do socket da web', () => {
    const connect = (token: string) =>
      new Promise<void>((resolve, reject) => {
        const s = io(url, {
          transports: ['websocket'],
          auth: { token },
          forceNew: true,
          reconnection: false,
        });
        s.once('connect', () => {
          s.disconnect();
          resolve();
        });
        s.once('connect_error', reject);
      });

    it('abre o socket com o token curto; um token alterado é recusado', async () => {
      const t = await users('Web');
      const res = await as(t.Web!).get('/auth/socket-token').expect(200);
      expect(res.body.token).toMatch(
        new RegExp(`^${t.Web!.id}\\.\\d{13}\\.[\\w-]{43}$`),
      );
      await connect(res.body.token as string);

      const forged = (res.body.token as string).replace(
        /\.\d{13}\./,
        `.${Date.now() + 3_600_000}.`,
      );
      await expect(connect(forged)).rejects.toThrow('Sessão inválida');
      const otherUser = (res.body.token as string).replace(
        t.Web!.id,
        randomUUID(),
      );
      await expect(connect(otherUser)).rejects.toThrow('Sessão inválida');
    });
  });

  describe('cancelar um jogo', () => {
    it('só o organizador cancela; os jogadores são avisados e não podem confirmar', async () => {
      const t = await users('Org', 'A', 'B', 'C');
      const id = await game(t.Org!, 2, 2);
      for (const n of ['Org', 'A', 'B'])
        await as(t[n]!).post(confirmPath(id)).expect(200);
      const aDevice = await device(t.A!);
      const bDevice = await device(t.B!);
      await device(t.Org!);

      await as(t.A!).post(`/games/${id}/cancel`).expect(403);
      const res = await as(t.Org!).post(`/games/${id}/cancel`).expect(200);
      expect((res.body as GameDetailDto).status).toBe('cancelled');

      // Confirmado (A) e em espera (B) são avisados; o organizador não.
      expect(pushes.map((p) => p.to).sort()).toEqual([aDevice, bDevice].sort());
      expect(pushes[0]!.title).toBe('Jogo cancelado');

      await as(t.C!).post(confirmPath(id)).expect(409);
      await as(t.Org!).patch(`/games/${id}`).send({ slots: 4 }).expect(409);
      await as(t.Org!).post(`/games/${id}/teams`).send({}).expect(409);

      // Sai dos lembretes de quem estava confirmado.
      const reminders = (await as(t.A!).get('/push/reminders').expect(200))
        .body as RemindersDto;
      expect(reminders.games.map((g) => g.gameId)).not.toContain(id);

      // Cancelar outra vez não volta a avisar.
      pushes = [];
      await as(t.Org!).post(`/games/${id}/cancel`).expect(200);
      expect(pushes).toEqual([]);
    });
  });

  describe('apagar a conta', () => {
    it('pede a password; sai dos jogos dos outros e a lista de espera sobe', async () => {
      const t = await users('Org', 'Sai', 'Espera');
      const id = await game(t.Org!, 2, 2);
      for (const n of ['Org', 'Sai', 'Espera'])
        await as(t[n]!).post(confirmPath(id)).expect(200);

      await as(t.Sai!)
        .delete('/account')
        .send({ password: 'errada' })
        .expect(403);
      await as(t.Sai!)
        .delete('/account')
        .send({ password: 'password-antiga' })
        .expect(204);

      await login(t.Sai!.email, 'password-antiga').expect(401);
      await as(t.Sai!).get('/auth/me').expect(401);
      const detail = (await as(t.Org!).get(`/games/${id}/detail`).expect(200))
        .body as GameDetailDto;
      expect(detail.participations.map((p) => [p.userName, p.status])).toEqual([
        ['Org', 'confirmed'],
        ['Espera', 'confirmed'],
      ]);
    });

    it('quem organiza jogos marcados com outros tem de os cancelar primeiro', async () => {
      const t = await users('Org', 'A');
      const id = await game(t.Org!);
      await as(t.A!).post(confirmPath(id)).expect(200);

      const res = await as(t.Org!)
        .delete('/account')
        .send({ password: 'password-antiga' })
        .expect(409);
      expect(res.body.message).toContain('"Futebolada"');

      await as(t.Org!).post(`/games/${id}/cancel`).expect(200);
      await as(t.Org!)
        .delete('/account')
        .send({ password: 'password-antiga' })
        .expect(204);
      // O jogo cancelado desaparece com a conta.
      await as(t.A!).get(`/games/${id}/detail`).expect(404);
    });

    it('jogos só com o organizador não bloqueiam', async () => {
      const t = await users('Sozinho');
      await game(t.Sozinho!);
      await as(t.Sozinho!)
        .delete('/account')
        .send({ password: 'password-antiga' })
        .expect(204);
    });
  });
});
