import type { DataSource, Repository } from 'typeorm';
import type { Rating } from '@convocados/db';
import { RatingsService } from './ratings.service.js';

describe('RatingsService.strengthScores', () => {
  it('aplica prior Bayesian e média do grupo; sem avaliações → prior', async () => {
    const qb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([
        { userId: 'a', sum: '5', count: '1' },
        { userId: 'b', sum: '3', count: '1' },
      ]),
    };
    const repo = {
      createQueryBuilder: vi.fn(() => qb),
    } as unknown as Repository<Rating>;
    const service = new RatingsService(
      { manager: {} } as DataSource,
      repo,
    );

    const map = await service.strengthScores(['a', 'b', 'c']);
    // prior = (5+3)/2 = 4; a: (5+4*3)/(1+3)=17/4=4.25 → 4.3; b: (3+12)/4=3.75→3.8; c: 4
    expect(map.get('a')).toBe(4.3);
    expect(map.get('b')).toBe(3.8);
    expect(map.get('c')).toBe(4);
  });
});
