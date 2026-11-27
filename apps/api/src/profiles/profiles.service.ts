import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Game, Participation, Rating, User } from '@convocados/db';
import {
  initials,
  PREFERRED_FEET,
  PREFERRED_POSITIONS,
  type PlayerProfileDto,
  type PlayerRecentGameDto,
  type PlayerStatsDto,
  type PreferredFoot,
  type PreferredPosition,
  type UpdateProfileInput,
} from '@convocados/shared';

const asPosition = (v: string | null): PreferredPosition | null =>
  v && (PREFERRED_POSITIONS as readonly string[]).includes(v)
    ? (v as PreferredPosition)
    : null;

const asFoot = (v: string | null): PreferredFoot | null =>
  v && (PREFERRED_FEET as readonly string[]).includes(v)
    ? (v as PreferredFoot)
    : null;

const blankToNull = (v: string | null) => {
  if (v === null) return null;
  const t = v.trim();
  return t === '' ? null : t;
};

@Injectable()
export class ProfilesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getById(userId: string, now = new Date()): Promise<PlayerProfileDto> {
    const user = await this.dataSource.manager.findOneBy(User, { id: userId });
    if (!user) throw new NotFoundException('Jogador não encontrado.');
    const stats = await this.computeStats(userId, now);
    return this.toDto(user, stats);
  }

  async update(
    userId: string,
    input: UpdateProfileInput,
    now = new Date(),
  ): Promise<PlayerProfileDto> {
    const user = await this.dataSource.manager.findOneBy(User, { id: userId });
    if (!user) throw new NotFoundException('Jogador não encontrado.');

    if (input.displayName !== undefined) user.name = input.displayName;
    if (input.preferredPosition !== undefined) {
      user.preferredPosition = input.preferredPosition;
    }
    if (input.preferredFoot !== undefined) {
      user.preferredFoot = input.preferredFoot;
    }
    if (input.city !== undefined) user.city = blankToNull(input.city);
    if (input.bio !== undefined) user.bio = blankToNull(input.bio);

    await this.dataSource.manager.save(user);
    const stats = await this.computeStats(userId, now);
    return this.toDto(user, stats);
  }

  private toDto(user: User, stats: PlayerStatsDto): PlayerProfileDto {
    return {
      id: user.id,
      displayName: user.name,
      initials: initials(user.name),
      preferredPosition: asPosition(user.preferredPosition),
      preferredFoot: asFoot(user.preferredFoot),
      city: user.city,
      bio: user.bio,
      stats,
    };
  }

  /** Estatísticas a partir de participações, jogos e avaliações já existentes. */
  async computeStats(userId: string, now = new Date()): Promise<PlayerStatsDto> {
    const manager = this.dataSource.manager;

    const [gamesPlayed, gamesOrganized, ratingRow, recentParts] =
      await Promise.all([
        manager
          .createQueryBuilder(Participation, 'p')
          .innerJoin(Game, 'g', 'g.id = p.gameId')
          .where('p.userId = :userId', { userId })
          .andWhere('p.status = :status', { status: 'confirmed' })
          .andWhere('g.startsAt <= :now', { now })
          .getCount(),
        manager.count(Game, { where: { organizerId: userId } }),
        manager
          .createQueryBuilder(Rating, 'r')
          .innerJoin(Game, 'g', 'g.id = r.gameId')
          .select('AVG(r.score)', 'avg')
          .addSelect('COUNT(*)', 'count')
          .where('r.toUserId = :userId', { userId })
          .andWhere('g.startsAt <= :now', { now })
          .getRawOne<{ avg: string | null; count: string }>(),
        manager
          .createQueryBuilder(Participation, 'p')
          .innerJoinAndSelect('p.game', 'g')
          .leftJoinAndSelect('g.venue', 'v')
          .where('p.userId = :userId', { userId })
          .andWhere('p.status = :status', { status: 'confirmed' })
          .andWhere('g.startsAt <= :now', { now })
          .orderBy('g.startsAt', 'DESC')
          .take(5)
          .getMany(),
      ]);

    const ratingsCount = Number(ratingRow?.count ?? 0);
    const averageRating =
      ratingsCount > 0 && ratingRow?.avg != null
        ? Math.round(Number(ratingRow.avg) * 10) / 10
        : null;

    const recentGames: PlayerRecentGameDto[] = recentParts.map((p) => {
      const game = p.game;
      const venue = game.venue;
      return {
        id: game.id,
        startsAt: game.startsAt.toISOString(),
        venueName: venue?.name ?? game.location,
        result: null,
      };
    });

    return {
      gamesPlayed,
      gamesOrganized,
      averageRating,
      ratingsCount,
      recentGames,
    };
  }
}
