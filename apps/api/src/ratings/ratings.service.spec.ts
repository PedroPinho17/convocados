import { ConflictException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { Rating } from '@convocados/db';
import { RatingsService } from './ratings.service.js';

const NOW = new Date('2030-01-10T22:00:00.000Z');

function setup(startsAt: string) {
  const game = { id: 'g1', startsAt: new Date(startsAt) };
  const manager = {
    findOneBy: vi.fn(async (entity: { name: string }, where: Record<string, unknown>) => {
      if (entity.name === 'Game') return game;
      if (entity.name === 'Participation')
        return { gameId: 'g1', userId: where.userId, status: 'confirmed' };
      if (entity.name === 'User') return { id: where.id, name: 'Rui' };
      return null;
    }),
  };
  const dataSource = { manager } as unknown as DataSource;
  const row = {
    id: 'r1',
    gameId: 'g1',
    fromUserId: 'a',
    toUserId: 'b',
    score: 4,
    createdAt: NOW,
  };
  const repo = {
    upsert: vi.fn(async () => undefined),
    findOneByOrFail: vi.fn(async () => row),
  };
  const service = new RatingsService(
    dataSource,
    repo as unknown as Repository<Rating>,
  );
  return { service, repo };
}

describe('RatingsService: só se avalia depois de o jogo começar', () => {
  it('antes da hora do jogo: 409 e nada é gravado', async () => {
    const { service, repo } = setup('2030-01-10T22:30:00.000Z');
    await expect(
      service.upsert('g1', 'a', { toUserId: 'b', score: 4 }, NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('à hora exata do início já se pode avaliar', async () => {
    const { service, repo } = setup(NOW.toISOString());
    const dto = await service.upsert(
      'g1',
      'a',
      { toUserId: 'b', score: 4 },
      NOW,
    );
    expect(repo.upsert).toHaveBeenCalledTimes(1);
    expect(dto).toMatchObject({ toUserId: 'b', toUserName: 'Rui', score: 4 });
  });

  it('depois de começar: grava a nota', async () => {
    const { service, repo } = setup('2030-01-10T21:00:00.000Z');
    await service.upsert('g1', 'a', { toUserId: 'b', score: 4 }, NOW);
    expect(repo.upsert).toHaveBeenCalledWith(
      { gameId: 'g1', fromUserId: 'a', toUserId: 'b', score: 4 },
      { conflictPaths: ['gameId', 'fromUserId', 'toUserId'] },
    );
  });
});
