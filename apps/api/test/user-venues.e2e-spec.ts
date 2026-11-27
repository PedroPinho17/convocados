import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Campos acrescentados à mão (POST /venues). Precisa do Postgres local (pnpm db:up).
describe('campos acrescentados pelos utilizadores (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${token}` });
  // Nome único por execução: a tabela de campos é partilhada entre testes.
  const tag = randomUUID().slice(0, 8);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
    const res = await request(server())
      .post('/auth/mobile/register')
      .send({ name: 'Org', email: `venues-${randomUUID()}@test.local`, password: 'password-de-teste' })
      .expect(201);
    token = res.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('guarda o campo, que passa a aparecer na pesquisa (sem coordenadas)', async () => {
    const created = await request(server())
      .post('/venues')
      .set(auth())
      .send({ name: `  Pavilhão   da Escola ${tag} `, sport: 'padel' })
      .expect(201);
    expect(created.body).toMatchObject({
      name: `Pavilhão da Escola ${tag}`,
      city: null,
      lat: null,
      lng: null,
      sports: ['padel'],
    });

    const found = await request(server())
      .get('/venues')
      .set(auth())
      .query({ q: `pavilhao escola ${tag}`, sport: 'padel' })
      .expect(200);
    expect(found.body.map((v: { id: string }) => v.id)).toContain(created.body.id);
  });

  it('o mesmo nome (com outros acentos e maiúsculas) devolve o campo que já existe', async () => {
    const first = await request(server())
      .post('/venues')
      .set(auth())
      .send({ name: `Campo do Grémio ${tag}`, city: 'Fiães' })
      .expect(201);
    const again = await request(server())
      .post('/venues')
      .set(auth())
      .send({ name: `campo do gremio ${tag}`, city: 'fiaes' })
      .expect(201);
    expect(again.body.id).toBe(first.body.id);
  });

  it('pede sessão e um nome com pelo menos 3 letras', async () => {
    await request(server()).post('/venues').send({ name: 'Campo novo' }).expect(401);
    await request(server()).post('/venues').set(auth()).send({ name: 'ab' }).expect(400);
  });
});
