import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok when the database answers', async () => {
    const db = { query: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: db }],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('/health/live responde sem tocar na base de dados (o ping não carrega o Render Postgres)', async () => {
    const db = { query: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: db }],
    }).compile();

    expect(module.get(HealthController).live()).toEqual({ status: 'ok' });
    expect(db.query).not.toHaveBeenCalled();
  });
});
