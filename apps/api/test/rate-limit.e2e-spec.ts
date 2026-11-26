import { Test } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Os outros e2e desligam o limite (vitest.config.e2e.ts); este liga-o.
// O AppModule é importado só depois, para o ConfigModule ler o valor certo.
process.env.RATE_LIMIT_DISABLED = 'false';

describe('limite de pedidos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login: à 11.ª tentativa no mesmo minuto dá 429', async () => {
    const body = { email: 'ninguem@test.local', password: 'errada' };
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post('/auth/mobile/login').send(body).expect(401);
    }
    await request(app.getHttpServer()).post('/auth/mobile/login').send(body).expect(429);
  });
});
