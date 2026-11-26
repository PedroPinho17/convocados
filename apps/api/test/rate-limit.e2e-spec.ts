import { Test } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Os outros e2e desligam o limite (vitest.config.e2e.ts); este liga-o.
// O AppModule é importado só depois, para o ConfigModule ler o valor certo.
process.env.RATE_LIMIT_DISABLED = 'false';
process.env.PROXY_SECRET = 'segredo-do-proxy-de-teste';

describe('limite de pedidos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.PROXY_SECRET;
  });

  it('login: à 11.ª tentativa no mesmo minuto dá 429', async () => {
    const body = { email: 'ninguem@test.local', password: 'errada' };
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/mobile/login')
        .send(body)
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/auth/mobile/login')
      .send(body)
      .expect(429);
  });

  // Os pedidos da web chegam todos do proxy do Next.js: o limite tem de ser por pessoa.
  const viaProxy = (ip: string, secret = 'segredo-do-proxy-de-teste') =>
    request(app.getHttpServer())
      .post('/auth/mobile/login')
      .set('X-Proxy-Secret', secret)
      .set('X-Client-IP', ip)
      .send({ email: 'ninguem@test.local', password: 'errada' });

  it('pelo proxy: cada pessoa tem o seu limite', async () => {
    for (let i = 0; i < 10; i++) await viaProxy('203.0.113.1').expect(401);
    await viaProxy('203.0.113.1').expect(429);
    // Outra pessoa atrás do mesmo proxy ainda pode tentar.
    await viaProxy('203.0.113.2').expect(401);
  });

  it('sem o segredo certo, o X-Client-IP é ignorado (ninguém foge ao limite)', async () => {
    // O IP local já esgotou o limite no 1.º teste: mudar o X-Client-IP não ajuda.
    await viaProxy('203.0.113.99', 'segredo-errado-com-16-letras').expect(429);
    await request(app.getHttpServer())
      .post('/auth/mobile/login')
      .set('X-Client-IP', '203.0.113.98')
      .send({ email: 'ninguem@test.local', password: 'errada' })
      .expect(429);
  });
});
