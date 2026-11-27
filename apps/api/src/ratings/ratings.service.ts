import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Game, Participation, Rating, User } from '@convocados/db';
import {
  bayesianStrength,
  DEFAULT_STRENGTH_PRIOR,
  roundStrength,
  type RatingDto,
  type UpsertRatingInput,
} from '@convocados/shared';

const toDto = (r: Rating, toUserName: string): RatingDto => ({
  id: r.id,
  gameId: r.gameId,
  fromUserId: r.fromUserId,
  toUserId: r.toUserId,
  toUserName,
  score: r.score,
  createdAt: r.createdAt.toISOString(),
});

@Injectable()
export class RatingsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Rating) private readonly ratings: Repository<Rating>,
  ) {}

  /** Só as avaliações que EU dei neste jogo: as de cada um são privadas. */
  async listMine(gameId: string, fromUserId: string): Promise<RatingDto[]> {
    const game = await this.dataSource.manager.findOneBy(Game, { id: gameId });
    if (!game) throw new NotFoundException('Jogo não encontrado.');

    const rows = await this.ratings.find({
      where: { gameId, fromUserId },
      order: { createdAt: 'ASC' },
    });
    if (rows.length === 0) return [];

    const users = await this.dataSource.manager.findBy(User, {
      id: In(rows.map((r) => r.toUserId)),
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => toDto(r, nameById.get(r.toUserId) ?? 'Jogador'));
  }

  async upsert(
    gameId: string,
    fromUserId: string,
    input: UpsertRatingInput,
    now = new Date(),
  ): Promise<RatingDto> {
    if (input.toUserId === fromUserId) {
      throw new BadRequestException('Não podes avaliar-te a ti próprio.');
    }

    const manager = this.dataSource.manager;
    const game = await manager.findOneBy(Game, { id: gameId });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    // Avalia-se como cada um jogou: só depois de o jogo começar.
    if (game.startsAt.getTime() > now.getTime()) {
      throw new ConflictException(
        'Só podes avaliar depois de o jogo começar.',
      );
    }

    const [fromPart, toPart] = await Promise.all([
      manager.findOneBy(Participation, {
        gameId,
        userId: fromUserId,
        status: 'confirmed',
      }),
      manager.findOneBy(Participation, {
        gameId,
        userId: input.toUserId,
        status: 'confirmed',
      }),
    ]);
    if (!fromPart) {
      throw new ConflictException('Só jogadores confirmados podem avaliar.');
    }
    if (!toPart) {
      throw new ConflictException(
        'Só podes avaliar jogadores confirmados neste jogo.',
      );
    }

    // INSERT … ON CONFLICT: dois pedidos ao mesmo tempo não chocam no índice único.
    const key = { gameId, fromUserId, toUserId: input.toUserId };
    await this.ratings.upsert(
      { ...key, score: input.score },
      { conflictPaths: ['gameId', 'fromUserId', 'toUserId'] },
    );
    const row = await this.ratings.findOneByOrFail(key);
    const toUser = await manager.findOneBy(User, { id: input.toUserId });
    return toDto(row, toUser?.name ?? 'Jogador');
  }

  /** Média simples das avaliações recebidas. Sem avaliações → 3. */
  async averageScores(userIds: string[]): Promise<Map<string, number>> {
    const map = new Map(userIds.map((id) => [id, DEFAULT_STRENGTH_PRIOR]));
    if (userIds.length === 0) return map;

    const rows = await this.ratings
      .createQueryBuilder('r')
      .select('r.toUserId', 'userId')
      .addSelect('AVG(r.score)', 'avg')
      .where('r.toUserId IN (:...userIds)', { userIds })
      .groupBy('r.toUserId')
      .getRawMany<{ userId: string; avg: string }>();

    for (const row of rows) map.set(row.userId, Number(row.avg));
    return map;
  }

  /**
   * Força para equipas equilibradas: Bayesian com prior = média do grupo
   * (só avaliações de jogos já começados). Sem avaliações → prior do grupo.
   */
  async strengthScores(
    userIds: string[],
    now = new Date(),
  ): Promise<Map<string, number>> {
    const map = new Map(
      userIds.map((id) => [id, DEFAULT_STRENGTH_PRIOR]),
    );
    if (userIds.length === 0) return map;

    const rows = await this.ratings
      .createQueryBuilder('r')
      .innerJoin(Game, 'g', 'g.id = r.gameId')
      .select('r.toUserId', 'userId')
      .addSelect('SUM(r.score)', 'sum')
      .addSelect('COUNT(*)', 'count')
      .where('r.toUserId IN (:...userIds)', { userIds })
      .andWhere('g.startsAt <= :now', { now })
      .groupBy('r.toUserId')
      .getRawMany<{ userId: string; sum: string; count: string }>();

    let totalSum = 0;
    let totalCount = 0;
    const stats = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const sum = Number(row.sum);
      const count = Number(row.count);
      stats.set(row.userId, { sum, count });
      totalSum += sum;
      totalCount += count;
    }

    const prior =
      totalCount > 0
        ? totalSum / totalCount
        : DEFAULT_STRENGTH_PRIOR;

    for (const id of userIds) {
      const s = stats.get(id);
      const raw = s
        ? bayesianStrength(s.sum, s.count, prior)
        : prior;
      map.set(id, roundStrength(raw));
    }
    return map;
  }
}
