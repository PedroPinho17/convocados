import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { ProfilesService } from './profiles.service.js';

const NOW = new Date('2030-01-10T22:00:00.000Z');

function setup(user: Record<string, unknown> | null) {
  const qb = {
    innerJoin: vi.fn().mockReturnThis(),
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getCount: vi.fn().mockResolvedValue(2),
    getRawOne: vi.fn().mockResolvedValue({ avg: '4.5', count: '2' }),
    getMany: vi.fn().mockResolvedValue([
      {
        gameId: 'g1',
        game: {
          id: 'g1',
          startsAt: new Date('2030-01-09T21:00:00.000Z'),
          location: 'Pavilhão',
          scoreA: null,
          scoreB: null,
          venue: { name: 'Campo Municipal' },
        },
      },
    ]),
  };

  const manager = {
    findOneBy: vi.fn(async () => user),
    find: vi.fn(async () => []),
    save: vi.fn(async (u: unknown) => u),
    count: vi.fn().mockResolvedValue(1),
    createQueryBuilder: vi.fn(() => qb),
  };

  const dataSource = { manager } as unknown as DataSource;
  const service = new ProfilesService(dataSource);
  return { service, manager, qb };
}

describe('ProfilesService', () => {
  it('getById: 404 se o jogador não existe', async () => {
    const { service } = setup(null);
    await expect(service.getById('missing', NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getById: devolve perfil público sem email e com stats', async () => {
    const { service } = setup({
      id: 'u1',
      name: 'Ana Silva',
      email: 'ana@secret.local',
      preferredPosition: 'MID',
      preferredFoot: 'RIGHT',
      city: 'Porto',
      bio: 'Gosto de jogar.',
    });

    const dto = await service.getById('u1', NOW);
    expect(dto).toMatchObject({
      id: 'u1',
      displayName: 'Ana Silva',
      initials: 'AS',
      preferredPosition: 'MID',
      preferredFoot: 'RIGHT',
      city: 'Porto',
      bio: 'Gosto de jogar.',
      stats: {
        gamesPlayed: 2,
        gamesOrganized: 1,
        averageRating: 4.5,
        ratingsCount: 2,
      },
    });
    expect(dto).not.toHaveProperty('email');
    expect(JSON.stringify(dto)).not.toContain('ana@secret.local');
    expect(dto.stats.recentGames[0]).toMatchObject({
      id: 'g1',
      venueName: 'Campo Municipal',
    });
  });

  it('update: altera o nome (displayName) e limpa cidade vazia', async () => {
    const user = {
      id: 'u1',
      name: 'Ana',
      preferredPosition: null,
      preferredFoot: null,
      city: 'Porto',
      bio: null,
    };
    const { service, manager } = setup(user);

    const dto = await service.update(
      'u1',
      {
        displayName: 'Ana Costa',
        preferredPosition: 'FWD',
        city: '  ',
        bio: 'Olá',
      },
      NOW,
    );

    expect(manager.save).toHaveBeenCalled();
    expect(dto.displayName).toBe('Ana Costa');
    expect(dto.preferredPosition).toBe('FWD');
    expect(dto.city).toBeNull();
    expect(dto.bio).toBe('Olá');
    expect(dto).not.toHaveProperty('email');
  });
});
