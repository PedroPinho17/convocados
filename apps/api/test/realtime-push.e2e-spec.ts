import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type { DataSource } from 'typeorm';
import { PushToken } from '@convocados/db';
import type { GameDetailDto, RemindersDto } from '@convocados/shared';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';
import { applySecurityHeaders } from '../src/security-headers.js';

// URL de um pedido do fetch, seja string, URL ou Request.
const urlOf = (input: string | URL | Request) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

// Precisa do Postgres local (pnpm db:up) e do .env na raiz.
describe('tempo real e notificações (e2e)', () => {
  let app: INestApplication<App>;
  let url: string;
  const server = () => app.getHttpServer();
  const sockets: ClientSocket[] = [];

  /** Mensagens enviadas à Expo (o fetch é simulado: nada sai para a internet). */
  let sent: PushMessage[] = [];
  /** Resposta simulada da Expo para cada mensagem; por defeito, ok. */
  let expoReply: (m: PushMessage) => object = () => ({
    status: 'ok',
    id: randomUUID(),
  });
  let expoDown = false;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!urlOf(input).startsWith('https://exp.host/'))
        return realFetch(input, init);
      if (expoDown) throw new TypeError('fetch failed');
      const messages = JSON.parse(init?.body as string) as PushMessage[];
      sent.push(...messages);
      return new Response(
        JSON.stringify({ data: messages.map((m) => expoReply(m)) }),
        {
          status: 200,
        },
      );
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    // Como em produção: o Socket.IO tem de funcionar com o helmet ligado.
    applySecurityHeaders(app);
    await app.listen(0, '127.0.0.1');
    const address = (
      server() as unknown as HttpServer
    ).address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    sent = [];
    expoDown = false;
    expoReply = () => ({ status: 'ok', id: randomUUID() });
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await app.close();
    vi.restoreAllMocks();
  });

  async function users(...names: string[]) {
    const tokens: Record<string, string> = {};
    for (const name of names) {
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({
          name,
          email: `${name}-${randomUUID()}@test.local`,
          password: 'password-de-teste',
        })
        .expect(201);
      tokens[name] = res.body.token;
    }
    return tokens;
  }

  const as = (token: string) => ({
    post: (path: string) =>
      request(server()).post(path).set('Authorization', `Bearer ${token}`),
    put: (path: string) =>
      request(server()).put(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string) =>
      request(server()).patch(path).set('Authorization', `Bearer ${token}`),
    get: (path: string) =>
      request(server()).get(path).set('Authorization', `Bearer ${token}`),
  });

  async function newGame(token: string, slots: number, subs: number) {
    const res = await as(token)
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
    return rememberInvite(res.body as { id: string; inviteCode: string });
  }

  /** Regista um token Expo para o utilizador e devolve-o. */
  async function device(token: string) {
    const pushToken = `ExponentPushToken[${randomUUID()}]`;
    await as(token)
      .post('/push/register')
      .send({ token: pushToken, platform: 'android' })
      .expect(204);
    return pushToken;
  }

  function connect(token?: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const s = io(url, {
        transports: ['websocket'],
        auth: token ? { token } : {},
        forceNew: true,
        reconnection: false,
      });
      sockets.push(s);
      s.once('connect', () => resolve(s));
      s.once('connect_error', reject);
    });
  }

  async function watch(token: string, gameId: string) {
    const s = await connect(token);
    expect(await s.emitWithAck('joinGame', gameId)).toEqual({ ok: true });
    return s;
  }

  const nextUpdate = (s: ClientSocket) =>
    new Promise<GameDetailDto>((resolve) => s.once('gameUpdated', resolve));

  const queue = (d: GameDetailDto) =>
    d.participations
      .map((p) => `${p.userName}:${p.status === 'confirmed' ? 'C' : 'W'}`)
      .join(' ');

  it('desistir: quem tem o jogo aberto recebe a lista nova e o promovido recebe push', async () => {
    const t = await users('A', 'B', 'C');
    const { id } = await newGame(t.A, 2, 2);
    for (const n of ['A', 'B', 'C'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    const cDevice = await device(t.C);

    const s = await watch(t.A, id);
    const update = nextUpdate(s);
    await as(t.B).post(`/games/${id}/leave`).expect(200);

    expect(queue(await update)).toBe('A:C C:C');
    expect(sent).toEqual([
      expect.objectContaining({
        to: cDevice,
        title: 'Entraste na convocatória',
      }),
    ]);
  });

  it('editar o jogo com mais vagas: atualiza os ecrãs e avisa os promovidos', async () => {
    const t = await users('A', 'B', 'C');
    const { id } = await newGame(t.A, 2, 2);
    for (const n of ['A', 'B', 'C'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    const cDevice = await device(t.C);

    const s = await watch(t.B, id);
    const update = nextUpdate(s);
    await as(t.A).patch(`/games/${id}`).send({ slots: 3 }).expect(200);

    expect(queue(await update)).toBe('A:C B:C C:C');
    expect(sent.map((m) => [m.to, m.title])).toEqual([
      [cDevice, 'Entraste na convocatória'],
    ]);
  });

  it('um confirmado desiste e ninguém está à espera: o organizador recebe "faltam jogadores"', async () => {
    const t = await users('Org', 'B');
    const { id } = await newGame(t.Org, 4, 2);
    for (const n of ['Org', 'B'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    const orgDevice = await device(t.Org);

    await as(t.B).post(`/games/${id}/leave`).expect(200);

    expect(sent).toEqual([
      expect.objectContaining({
        to: orgDevice,
        title: 'Faltam jogadores',
        body: 'Faltam 3 jogadores em "Futebolada".',
      }),
    ]);
  });

  it('se a Expo falhar, desistir continua a funcionar', async () => {
    const t = await users('A', 'B', 'C');
    const { id } = await newGame(t.A, 2, 1);
    for (const n of ['A', 'B', 'C'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    await device(t.C);

    expoDown = true;
    const res = await as(t.B).post(`/games/${id}/leave`).expect(200);
    expect(queue(res.body)).toBe('A:C C:C');
  });

  it('apaga tokens de apps desinstaladas (DeviceNotRegistered)', async () => {
    const t = await users('Org', 'B');
    const { id } = await newGame(t.Org, 4, 0);
    for (const n of ['Org', 'B'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    const dead = await device(t.Org);
    expoReply = () => ({
      status: 'error',
      message: 'gone',
      details: { error: 'DeviceNotRegistered' },
    });

    await as(t.B).post(`/games/${id}/leave`).expect(200);

    const tokens = app
      .get<DataSource>(getDataSourceToken())
      .getRepository(PushToken);
    expect(await tokens.findOneBy({ token: dead })).toBeNull();
  });

  it('sair da conta: o token deixa de receber notificações', async () => {
    const t = await users('Org', 'B');
    const { id } = await newGame(t.Org, 4, 0);
    for (const n of ['Org', 'B'])
      await as(t[n]).post(confirmPath(id)).expect(200);
    const orgDevice = await device(t.Org);
    await as(t.Org)
      .post('/push/unregister')
      .send({ token: orgDevice })
      .expect(204);

    await as(t.B).post(`/games/${id}/leave`).expect(200);
    expect(sent).toEqual([]);
  });

  it('socket sem sessão válida é recusado; ids que não são UUID também', async () => {
    await expect(connect()).rejects.toThrow('Sessão inválida');
    await expect(connect('x'.repeat(43))).rejects.toThrow('Sessão inválida');

    const t = await users('A');
    const s = await connect(t.A);
    expect(await s.emitWithAck('joinGame', 'nao-e-um-uuid')).toEqual({
      ok: false,
    });
  });

  it('joinGame: só entra na sala quem tem acesso ao jogo (ou traz o convite)', async () => {
    const t = await users('Org', 'A', 'Intruso', 'Convidado');
    const game = await newGame(t.Org, 4, 0);
    const other = await newGame(t.Org, 4, 0);
    await as(t.A).post(confirmPath(game.id)).expect(200);

    // Organizador e confirmados entram só com o id.
    await watch(t.Org, game.id);
    await watch(t.A, game.id);

    // Sem acesso: a mesma resposta de um jogo que não existe.
    const intruder = await connect(t.Intruso);
    expect(await intruder.emitWithAck('joinGame', game.id)).toEqual({
      ok: false,
    });
    expect(
      await intruder.emitWithAck('joinGame', {
        gameId: game.id,
        inviteCode: other.inviteCode,
      }),
    ).toEqual({ ok: false });
    expect(await intruder.emitWithAck('joinGame', randomUUID())).toEqual({
      ok: false,
    });

    // Quem abre o link do convite entra na sala com o código e recebe as atualizações.
    const guest = await connect(t.Convidado);
    expect(
      await guest.emitWithAck('joinGame', {
        gameId: game.id,
        inviteCode: game.inviteCode,
      }),
    ).toEqual({ ok: true });

    let intruderGotUpdate = false;
    intruder.on('gameUpdated', () => {
      intruderGotUpdate = true;
    });
    const update = nextUpdate(guest);
    await as(t.A).post(`/games/${game.id}/leave`).expect(200);
    expect((await update).confirmedCount).toBe(0);
    expect(intruderGotUpdate).toBe(false);
  });

  it('lembretes: por defeito 2 h antes; só aceita até 3 valores da lista', async () => {
    const t = await users('A', 'B');
    const { id } = await newGame(t.A, 4, 0);
    await as(t.B).post(confirmPath(id)).expect(200);

    let res = await as(t.B).get('/push/reminders').expect(200);
    let body = res.body as RemindersDto;
    expect(body.reminderMinutes).toEqual([120]);
    expect(body.games.map((g) => g.gameId)).toEqual([id]);

    await as(t.B)
      .put('/push/reminders')
      .send({ reminderMinutes: [15, 30, 60, 120] })
      .expect(400);
    await as(t.B)
      .put('/push/reminders')
      .send({ reminderMinutes: [45] })
      .expect(400);
    await as(t.B)
      .put('/push/reminders')
      .send({ reminderMinutes: [30, 30] })
      .expect(400);

    res = await as(t.B)
      .put('/push/reminders')
      .send({ reminderMinutes: [15, 120, 30] })
      .expect(200);
    body = res.body as RemindersDto;
    expect(body.reminderMinutes).toEqual([120, 30, 15]);

    // Quem desiste deixa de ter o jogo nos lembretes.
    await as(t.B).post(`/games/${id}/leave`).expect(200);
    res = await as(t.B).get('/push/reminders').expect(200);
    expect((res.body as RemindersDto).games).toEqual([]);
  });
});
