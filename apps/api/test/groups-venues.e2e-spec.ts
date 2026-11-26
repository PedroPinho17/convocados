import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { DataSource } from 'typeorm';
import { Venue } from '@convocados/db';
import type {
  GameDto,
  GroupDetailDto,
  GroupDto,
  VenueDto,
} from '@convocados/shared';
import { AppModule } from './../src/app.module.js';

// URL de um pedido do fetch, seja string, URL ou Request.
const urlOf = (input: string | URL | Request) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

type Push = { to: string; title: string; body: string };

/**
 * Grupos (tenants), jogos de vários desportos e pesquisa de campos.
 * Precisa do Postgres local (pnpm db:up) e do .env na raiz.
 */
describe('grupos, desportos e campos (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();
  const realFetch = globalThis.fetch;
  let pushes: Push[] = [];

  beforeAll(async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!urlOf(input).startsWith('https://exp.host/'))
        return realFetch(input, init);
      const sent = JSON.parse(init?.body as string) as Push[];
      pushes.push(...sent);
      return Response.json({
        data: sent.map(() => ({ status: 'ok', id: 'x' })),
      });
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    pushes = [];
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  type U = { token: string; id: string };
  async function users(...names: string[]) {
    const out: Record<string, U> = {};
    for (const name of names) {
      const res = await request(server())
        .post('/auth/mobile/register')
        .send({
          name,
          email: `${name.toLowerCase()}-${randomUUID()}@test.local`,
          password: 'password-de-teste',
        })
        .expect(201);
      out[name] = { token: res.body.token, id: res.body.user.id };
    }
    return out;
  }

  const as = (u: U) => {
    const auth = (r: request.Test) =>
      r.set('Authorization', `Bearer ${u.token}`);
    return {
      get: (p: string) => auth(request(server()).get(p)),
      post: (p: string) => auth(request(server()).post(p)),
      patch: (p: string) => auth(request(server()).patch(p)),
      delete: (p: string) => auth(request(server()).delete(p)),
    };
  };

  const gameBody = {
    title: 'Padel de sábado',
    location: 'Clube de Padel',
    startsAt: '2030-01-12T10:00:00.000Z',
    slots: 4,
    subs: 1,
    totalPriceCents: 2400,
  };

  async function device(u: U) {
    const token = `ExponentPushToken[${randomUUID()}]`;
    await as(u).post('/push/register').send({ token }).expect(204);
    return token;
  }

  describe('grupos', () => {
    it('criar: quem cria é admin; convite por link; entrar duas vezes não duplica', async () => {
      const t = await users('Ana', 'Rui');
      const created = (
        await as(t.Ana!)
          .post('/groups')
          .send({ name: 'Padel da empresa', sport: 'padel' })
          .expect(201)
      ).body as GroupDto;
      expect(created).toMatchObject({
        name: 'Padel da empresa',
        sport: 'padel',
        role: 'admin',
        memberCount: 1,
      });
      expect(created.inviteCode).toMatch(/^[0-9a-f]{12}$/);

      // Pré-visualização pública (sem sessão).
      const preview = await request(server())
        .get(`/group-invites/${created.inviteCode}`)
        .expect(200);
      expect(preview.body).toEqual({
        name: 'Padel da empresa',
        sport: 'padel',
        memberCount: 1,
      });

      // Quem não é membro não vê o grupo.
      await as(t.Rui!).get(`/groups/${created.id}`).expect(403);

      const joined = (
        await as(t.Rui!)
          .post(`/group-invites/${created.inviteCode}/join`)
          .expect(200)
      ).body as GroupDto;
      expect(joined).toMatchObject({ role: 'member', memberCount: 2 });
      await as(t.Rui!)
        .post(`/group-invites/${created.inviteCode}/join`)
        .expect(200);

      const detail = (await as(t.Rui!).get(`/groups/${created.id}`).expect(200))
        .body as GroupDetailDto;
      expect(detail.members.map((m) => [m.name, m.role])).toEqual([
        ['Ana', 'admin'],
        ['Rui', 'member'],
      ]);
      const mine = (await as(t.Rui!).get('/groups').expect(200))
        .body as GroupDto[];
      expect(mine.map((g) => g.id)).toContain(created.id);
    });

    it('jogos do grupo: só membros criam; todos os membros os veem e são avisados', async () => {
      const t = await users('Org', 'Membro', 'Fora');
      const group = (
        await as(t.Org!)
          .post('/groups')
          .send({ name: 'Ténis', sport: 'tennis' })
          .expect(201)
      ).body as GroupDto;
      await as(t.Membro!)
        .post(`/group-invites/${group.inviteCode}/join`)
        .expect(200);
      const membroDevice = await device(t.Membro!);
      await device(t.Org!);

      await as(t.Fora!)
        .post('/games')
        .send({ ...gameBody, groupId: group.id })
        .expect(403);

      const game = (
        await as(t.Org!)
          .post('/games')
          .send({ ...gameBody, sport: 'tennis', groupId: group.id })
          .expect(201)
      ).body as GameDto;
      expect(game).toMatchObject({
        sport: 'tennis',
        groupId: group.id,
        groupName: 'Ténis',
      });

      // Só o outro membro é avisado.
      expect(pushes.map((p) => p.to)).toEqual([membroDevice]);
      expect(pushes[0]!.title).toBe('Novo jogo em Ténis');

      // O membro vê o jogo nos seus jogos sem ter confirmado; quem é de fora não.
      const membroGames = (await as(t.Membro!).get('/games').expect(200))
        .body as GameDto[];
      expect(membroGames.find((g) => g.id === game.id)).toMatchObject({
        groupName: 'Ténis',
      });
      const foraGames = (await as(t.Fora!).get('/games').expect(200))
        .body as GameDto[];
      expect(foraGames.map((g) => g.id)).not.toContain(game.id);

      const detail = (
        await as(t.Membro!).get(`/groups/${group.id}`).expect(200)
      ).body as GroupDetailDto;
      expect(detail.games.map((g) => g.id)).toEqual([game.id]);
    });

    it('só admins removem membros; o último admin a sair passa o papel; o último a sair apaga o grupo', async () => {
      const t = await users('Admin', 'B', 'C');
      const group = (
        await as(t.Admin!)
          .post('/groups')
          .send({ name: 'Futebolada', sport: 'football' })
          .expect(201)
      ).body as GroupDto;
      for (const n of ['B', 'C']) {
        await as(t[n]!)
          .post(`/group-invites/${group.inviteCode}/join`)
          .expect(200);
      }

      await as(t.B!)
        .delete(`/groups/${group.id}/members/${t.C!.id}`)
        .expect(403);
      await as(t.Admin!)
        .delete(`/groups/${group.id}/members/${t.C!.id}`)
        .expect(204);
      await as(t.C!).get(`/groups/${group.id}`).expect(403);

      await as(t.Admin!).post(`/groups/${group.id}/leave`).expect(204);
      const asB = (await as(t.B!).get(`/groups/${group.id}`).expect(200))
        .body as GroupDetailDto;
      expect(asB.role).toBe('admin');

      await as(t.B!).post(`/groups/${group.id}/leave`).expect(204);
      await as(t.B!).get(`/groups/${group.id}`).expect(404);
    });

    it('apagar a conta do único admin passa o papel ao membro seguinte', async () => {
      const t = await users('Dono', 'Seguinte');
      const group = (
        await as(t.Dono!)
          .post('/groups')
          .send({ name: 'Basket', sport: 'basketball' })
          .expect(201)
      ).body as GroupDto;
      await as(t.Seguinte!)
        .post(`/group-invites/${group.inviteCode}/join`)
        .expect(200);

      await as(t.Dono!)
        .delete('/account')
        .send({ password: 'password-de-teste' })
        .expect(204);
      const detail = (
        await as(t.Seguinte!).get(`/groups/${group.id}`).expect(200)
      ).body as GroupDetailDto;
      expect(detail.role).toBe('admin');
      expect(detail.memberCount).toBe(1);
    });

    it('validação: nome curto, desporto desconhecido, convite mal formado', async () => {
      const t = await users('X');
      await as(t.X!)
        .post('/groups')
        .send({ name: 'A', sport: 'football' })
        .expect(400);
      await as(t.X!)
        .post('/groups')
        .send({ name: 'Xadrez', sport: 'chess' })
        .expect(400);
      await request(server()).get('/group-invites/nao-existe').expect(404);
      await as(t.X!).post('/group-invites/000000000000/join').expect(404);
    });
  });

  describe('desportos', () => {
    it('sem desporto fica futebol; editar não o repõe; o grupo não muda depois de criado', async () => {
      const t = await users('Org');
      const game = (await as(t.Org!).post('/games').send(gameBody).expect(201))
        .body as GameDto;
      expect(game.sport).toBe('football');

      const edited = (
        await as(t.Org!)
          .patch(`/games/${game.id}`)
          .send({ sport: 'padel' })
          .expect(200)
      ).body as GameDto;
      expect(edited.sport).toBe('padel');
      const again = (
        await as(t.Org!)
          .patch(`/games/${game.id}`)
          .send({ title: 'Outro título', groupId: randomUUID() })
          .expect(200)
      ).body as GameDto;
      expect(again).toMatchObject({ sport: 'padel', groupId: null });
    });
  });

  describe('campos', () => {
    const tag = randomUUID().slice(0, 8);
    let ids: Record<string, string> = {};

    beforeAll(async () => {
      const repo = app
        .get<DataSource>(getDataSourceToken())
        .getRepository(Venue);
      const rows = await repo.save([
        {
          name: `Pavilhão Teste ${tag}`,
          city: 'Fiães',
          lat: 40.986,
          lng: -8.52,
          sports: ['futsal'],
          source: 'user' as const,
        },
        {
          name: `Padel Teste ${tag}`,
          city: 'Lourosa',
          lat: 40.988,
          lng: -8.54,
          sports: ['padel'],
          source: 'user' as const,
        },
        {
          name: `Campo Longe ${tag}`,
          city: 'Lisboa',
          lat: 38.72,
          lng: -9.14,
          sports: ['soccer'],
          source: 'user' as const,
        },
      ]);
      ids = Object.fromEntries(rows.map((r) => [r.name.split(' ')[0]!, r.id]));
    });

    afterAll(async () => {
      await app
        .get<DataSource>(getDataSourceToken())
        .getRepository(Venue)
        .delete(Object.values(ids));
    });

    it('pesquisa por texto sem acentos, e por desporto', async () => {
      const t = await users('P');
      const byCity = (await as(t.P!).get(`/venues?q=fiaes ${tag}`).expect(200))
        .body as VenueDto[];
      expect(byCity.map((v) => v.id)).toEqual([ids.Pavilhão]);

      const padel = (
        await as(t.P!).get(`/venues?q=${tag}&sport=padel`).expect(200)
      ).body as VenueDto[];
      expect(padel.map((v) => v.id)).toEqual([ids.Padel]);
    });

    it('perto de um ponto: ordena por distância e respeita o raio', async () => {
      const t = await users('P');
      const near = (
        await as(t.P!)
          .get(`/venues?q=${tag}&lat=40.986&lng=-8.52&radiusKm=5`)
          .expect(200)
      ).body as VenueDto[];
      expect(near.map((v) => v.id)).toEqual([ids.Pavilhão, ids.Padel]);
      expect(near[0]!.distanceKm).toBe(0);
      expect(near[1]!.distanceKm).toBeGreaterThan(1);
    });

    it('valida a pesquisa e exige sessão', async () => {
      const t = await users('P');
      await as(t.P!).get('/venues?lat=40.9').expect(400);
      await as(t.P!).get('/venues?radiusKm=500&lat=1&lng=1').expect(400);
      await request(server()).get('/venues?q=x').expect(401);
    });

    it('um jogo pode ficar ligado a um campo da lista; um campo que não existe dá 400', async () => {
      const t = await users('Org');
      const game = (
        await as(t.Org!)
          .post('/games')
          .send({ ...gameBody, venueId: ids.Padel })
          .expect(201)
      ).body as GameDto;
      expect(game.venueId).toBe(ids.Padel);
      await as(t.Org!)
        .post('/games')
        .send({ ...gameBody, venueId: randomUUID() })
        .expect(400);
    });
  });
});
