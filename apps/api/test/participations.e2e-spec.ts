import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { GameDetailDto } from '@convocados/shared';
import { AppModule } from './../src/app.module.js';
import { confirmPath, rememberInvite } from './invites.js';

// Precisa do Postgres local (pnpm db:up) e do .env na raiz.
describe('participações (e2e)', () => {
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

  /** Cria contas e devolve um token por nome. */
  async function users(...names: string[]) {
    const tokens: Record<string, string> = {};
    for (const name of names) {
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({ name, email: `${name}-${randomUUID()}@test.local`, password: 'password-de-teste' })
        .expect(201);
      tokens[name] = res.body.token;
    }
    return tokens;
  }

  const as = (token: string) => ({
    post: (url: string) => request(server()).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(server()).patch(url).set('Authorization', `Bearer ${token}`),
    get: (url: string) => request(server()).get(url).set('Authorization', `Bearer ${token}`),
  });

  async function newGame(token: string, slots: number, subs: number, startsAt = '2030-01-10T21:00:00.000Z') {
    const res = await as(token)
      .post('/games')
      .send({ title: 'Futebolada', location: 'Pavilhão', startsAt, slots, subs, totalPriceCents: 3000 })
      .expect(201);
    return rememberInvite(res.body as { id: string; inviteCode: string });
  }

  const queue = (d: GameDetailDto) =>
    d.participations.map((p) => `${p.userName}:${p.status === 'confirmed' ? 'C' : 'W'}`).join(' ');

  it('a fila respeita a ordem de chegada mesmo depois de desistências', async () => {
    const t = await users('A', 'B', 'C', 'D', 'E', 'F');
    const { id } = await newGame(t.A, 2, 3);
    for (const n of ['A', 'B', 'C', 'D', 'E']) await as(t[n]).post(confirmPath(id)).expect(200);
    await as(t.A).post(`/games/${id}/leave`).expect(200); // C sobe
    await as(t.B).post(`/games/${id}/leave`).expect(200); // D sobe
    const res = await as(t.F).post(confirmPath(id)).expect(200);
    expect(queue(res.body)).toBe('C:C D:C E:W F:W');

    const after = await as(t.C).post(`/games/${id}/leave`).expect(200); // E sobe, não F
    expect(queue(after.body)).toBe('D:C E:C F:W');
  });

  it('confirmar duas vezes não duplica; desistir e voltar põe no fim da fila', async () => {
    const t = await users('A', 'B', 'C', 'D');
    const { id } = await newGame(t.A, 2, 2);
    await as(t.A).post(confirmPath(id)).expect(200);
    await as(t.A).post(confirmPath(id)).expect(200);
    for (const n of ['B', 'C', 'D']) await as(t[n]).post(confirmPath(id)).expect(200);
    await as(t.C).post(`/games/${id}/leave`).expect(200);
    const res = await as(t.C).post(confirmPath(id)).expect(200);
    expect(queue(res.body)).toBe('A:C B:C D:W C:W');
  });

  it('não deixa confirmar num jogo que já começou', async () => {
    const t = await users('A');
    const { id } = await newGame(t.A, 10, 2, '2020-01-01T21:00:00.000Z');
    await as(t.A).post(confirmPath(id)).expect(409);
  });

  it('editar vagas: não baixa abaixo dos confirmados; subir promove a lista de espera', async () => {
    const t = await users('A', 'B', 'C', 'D', 'E');
    const { id } = await newGame(t.A, 3, 2);
    for (const n of ['A', 'B', 'C', 'D', 'E']) await as(t[n]).post(confirmPath(id)).expect(200);

    await as(t.A).patch(`/games/${id}`).send({ slots: 2 }).expect(409);
    await as(t.A).patch(`/games/${id}`).send({ subs: 1 }).expect(409);

    await as(t.A).patch(`/games/${id}`).send({ slots: 4 }).expect(200);
    const detail = await as(t.A).get(`/games/${id}/detail`).expect(200);
    expect(queue(detail.body)).toBe('A:C B:C C:C D:C E:W');

    // Com o D promovido, só sobra 1 em espera: 1 suplente já chega.
    await as(t.A).patch(`/games/${id}`).send({ subs: 1 }).expect(200);
  });

  it('"os meus jogos" inclui os jogos em que confirmei, não os que deixei', async () => {
    const t = await users('Org', 'Jog');
    const { id } = await newGame(t.Org, 10, 0);
    await as(t.Jog).post(confirmPath(id)).expect(200);
    let mine = await as(t.Jog).get('/games').expect(200);
    expect(mine.body.map((g: { id: string }) => g.id)).toContain(id);

    await as(t.Jog).post(`/games/${id}/leave`).expect(200);
    mine = await as(t.Jog).get('/games').expect(200);
    expect(mine.body.map((g: { id: string }) => g.id)).not.toContain(id);
  });

  it('convite: público com código válido; 404 com código inválido', async () => {
    const t = await users('A');
    const { inviteCode } = await newGame(t.A, 10, 2);
    expect(inviteCode).toMatch(/^[0-9a-f]{12}$/);

    const res = await request(server()).get(`/invites/${inviteCode.toUpperCase()}`).expect(200);
    expect(res.body).toMatchObject({ title: 'Futebolada', slots: 10, subs: 2, confirmedCount: 0 });
    await request(server()).get('/invites/nao-existe').expect(404);
    await request(server()).get('/invites/000000000000').expect(404);
  });

  it('confirmar e desistir exigem sessão', async () => {
    const t = await users('A');
    const { id } = await newGame(t.A, 10, 2);
    await request(server()).post(confirmPath(id)).expect(401);
    await request(server()).post(`/games/${id}/leave`).expect(401);
    await request(server()).get(`/games/${id}/detail`).expect(401);
  });
});
