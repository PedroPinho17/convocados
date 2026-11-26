import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, type EntityManager } from 'typeorm';
import { Game, Participation, User } from '@convocados/db';
import type {
  GameDetailDto,
  GameDto,
  ParticipationDto,
  ParticipationStatus,
} from '@convocados/shared';

export const toGameDto = (g: Game): GameDto => ({
  id: g.id,
  organizerId: g.organizerId,
  title: g.title,
  location: g.location,
  startsAt: g.startsAt.toISOString(),
  slots: g.slots,
  subs: g.subs,
  totalPriceCents: g.totalPriceCents,
  inviteCode: g.inviteCode,
  status: g.status,
  createdAt: g.createdAt.toISOString(),
});

const toParticipationDto = (p: Participation, userName: string): ParticipationDto => ({
  id: p.id,
  gameId: p.gameId,
  userId: p.userId,
  userName,
  status: p.status,
  position: p.position,
  paid: p.paid,
  joinedAt: p.joinedAt.toISOString(),
});

/** Tranca a linha do jogo até ao fim da transação (SELECT … FOR UPDATE). */
export async function lockGame(manager: EntityManager, gameId: string): Promise<Game> {
  const game = await manager
    .createQueryBuilder(Game, 'g')
    .setLock('pessimistic_write')
    .where('g.id = :gameId', { gameId })
    .getOne();
  if (!game) throw new NotFoundException('Jogo não encontrado.');
  return game;
}

export async function countByStatus(manager: EntityManager, gameId: string) {
  const [confirmed, waiting] = await Promise.all([
    manager.count(Participation, { where: { gameId, status: 'confirmed' } }),
    manager.count(Participation, { where: { gameId, status: 'waiting' } }),
  ]);
  return { confirmed, waiting };
}

/**
 * Passa os primeiros da lista de espera a confirmados enquanto houver vagas.
 * Chamar sempre com o jogo trancado (`lockGame`) na mesma transação.
 */
export async function promoteFromWaiting(manager: EntityManager, game: Game): Promise<void> {
  const { confirmed } = await countByStatus(manager, game.id);
  const free = game.slots - confirmed;
  if (free <= 0) return;
  const next = await manager.find(Participation, {
    where: { gameId: game.id, status: 'waiting' },
    order: { position: 'ASC' },
    take: free,
  });
  for (const p of next) p.status = 'confirmed';
  if (next.length > 0) await manager.save(next);
}

@Injectable()
export class ParticipationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getDetail(gameId: string): Promise<GameDetailDto> {
    return this.buildDetail(this.dataSource.manager, gameId);
  }

  async getDetailByInviteCode(code: string): Promise<GameDetailDto> {
    const game = await this.dataSource.manager.findOneBy(Game, { inviteCode: code });
    if (!game) throw new NotFoundException('Convite inválido ou jogo não encontrado.');
    return this.buildDetail(this.dataSource.manager, game.id);
  }

  async confirm(gameId: string, userId: string): Promise<GameDetailDto> {
    return this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, gameId);
      if (game.status !== 'open') {
        throw new ConflictException('Este jogo já não aceita confirmações.');
      }
      if (game.startsAt.getTime() <= Date.now()) {
        throw new ConflictException('Este jogo já começou.');
      }

      const existing = await manager.findOne(Participation, { where: { gameId, userId } });
      if (existing && (existing.status === 'confirmed' || existing.status === 'waiting')) {
        return this.buildDetail(manager, gameId);
      }

      const { confirmed, waiting } = await countByStatus(manager, gameId);
      let status: ParticipationStatus;
      if (confirmed < game.slots) {
        status = 'confirmed';
      } else if (waiting < game.subs) {
        status = 'waiting';
      } else {
        throw new ConflictException('Jogo cheio (vagas e lista de espera).');
      }

      // Sempre no fim da fila: MAX(position) + 1. Com "confirmados + espera + 1",
      // depois de desistências, quem chegasse agora podia passar à frente de quem já esperava.
      const { max } = (await manager
        .createQueryBuilder(Participation, 'p')
        .select('COALESCE(MAX(p.position), 0)', 'max')
        .where('p.gameId = :gameId', { gameId })
        .getRawOne<{ max: number | string }>()) ?? { max: 0 };
      const position = Number(max) + 1;

      if (existing) {
        existing.status = status;
        existing.position = position;
        existing.joinedAt = new Date();
        await manager.save(existing);
      } else {
        await manager.save(manager.create(Participation, { gameId, userId, status, position, paid: false }));
      }

      return this.buildDetail(manager, gameId);
    });
  }

  async leave(gameId: string, userId: string): Promise<GameDetailDto> {
    return this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, gameId);

      const existing = await manager.findOne(Participation, { where: { gameId, userId } });
      if (!existing || existing.status === 'left') {
        return this.buildDetail(manager, gameId);
      }

      const wasConfirmed = existing.status === 'confirmed';
      existing.status = 'left';
      await manager.save(existing);
      if (wasConfirmed) await promoteFromWaiting(manager, game);

      return this.buildDetail(manager, gameId);
    });
  }

  private async buildDetail(manager: EntityManager, gameId: string): Promise<GameDetailDto> {
    const game = await manager.findOneBy(Game, { id: gameId });
    if (!game) throw new NotFoundException('Jogo não encontrado.');

    const rows = await manager.find(Participation, {
      where: { gameId, status: In(['confirmed', 'waiting'] satisfies ParticipationStatus[]) },
      order: { position: 'ASC' },
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length === 0 ? [] : await manager.findBy(User, { id: In(userIds) });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const participations = rows.map((p) => toParticipationDto(p, nameById.get(p.userId) ?? 'Jogador'));

    return {
      ...toGameDto(game),
      confirmedCount: participations.filter((p) => p.status === 'confirmed').length,
      waitingCount: participations.filter((p) => p.status === 'waiting').length,
      participations,
    };
  }
}
