import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, type EntityManager } from 'typeorm';
import { Game, Participation, TeamAssignment, User } from '@convocados/db';
import type {
  GameDetailDto,
  GameDto,
  ParticipationDto,
  ParticipationStatus,
  Sport,
  TeamDto,
} from '@convocados/shared';
import { GamesGateway } from '../realtime/games.gateway.js';
import { PushService } from '../push/push.service.js';

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
  sport: (g.sport ?? 'football') as Sport,
  venueId: g.venueId ?? null,
  groupId: g.groupId ?? null,
  // Só quando a relação vem carregada (lista, detalhe); nas outras respostas fica null.
  groupName: g.group?.name ?? null,
});

const toParticipationDto = (
  p: Participation,
  userName: string,
): ParticipationDto => ({
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
export async function lockGame(
  manager: EntityManager,
  gameId: string,
): Promise<Game> {
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
export async function promoteFromWaiting(
  manager: EntityManager,
  game: Game,
): Promise<string[]> {
  const { confirmed } = await countByStatus(manager, game.id);
  const free = game.slots - confirmed;
  if (free <= 0) return [];
  const next = await manager.find(Participation, {
    where: { gameId: game.id, status: 'waiting' },
    order: { position: 'ASC' },
    take: free,
  });
  for (const p of next) p.status = 'confirmed';
  if (next.length > 0) await manager.save(next);
  return next.map((p) => p.userId);
}

@Injectable()
export class ParticipationsService {
  private readonly logger = new Logger(ParticipationsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gamesGateway: GamesGateway,
    private readonly push: PushService,
  ) {}

  getDetail(gameId: string): Promise<GameDetailDto> {
    return this.buildDetail(this.dataSource.manager, gameId);
  }

  /** Lê o jogo já gravado e envia-o a quem o tem aberto. Ex.: equipas novas. */
  async publish(gameId: string): Promise<GameDetailDto> {
    const detail = await this.getDetail(gameId);
    this.gamesGateway.emitGameUpdated(gameId, detail);
    return detail;
  }

  async getDetailByInviteCode(code: string): Promise<GameDetailDto> {
    const game = await this.dataSource.manager.findOneBy(Game, {
      inviteCode: code,
    });
    if (!game)
      throw new NotFoundException('Convite inválido ou jogo não encontrado.');
    return this.buildDetail(this.dataSource.manager, game.id);
  }

  async confirm(gameId: string, userId: string): Promise<GameDetailDto> {
    const detail = await this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, gameId);
      if (game.status !== 'open') {
        throw new ConflictException('Este jogo já não aceita confirmações.');
      }
      if (game.startsAt.getTime() <= Date.now()) {
        throw new ConflictException('Este jogo já começou.');
      }

      const existing = await manager.findOne(Participation, {
        where: { gameId, userId },
      });
      if (
        existing &&
        (existing.status === 'confirmed' || existing.status === 'waiting')
      ) {
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
        await manager.save(
          manager.create(Participation, {
            gameId,
            userId,
            status,
            position,
            paid: false,
          }),
        );
      }

      return this.buildDetail(manager, gameId);
    });

    this.gamesGateway.emitGameUpdated(gameId, detail);
    return detail;
  }

  async leave(gameId: string, userId: string): Promise<GameDetailDto> {
    let promotedIds: string[] = [];
    let confirmedLeft = false;

    const detail = await this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, gameId);

      const existing = await manager.findOne(Participation, {
        where: { gameId, userId },
      });
      if (!existing || existing.status === 'left') {
        return this.buildDetail(manager, gameId);
      }

      confirmedLeft = existing.status === 'confirmed';
      existing.status = 'left';
      await manager.save(existing);
      // Quem desiste sai da equipa; se voltar, fica sem equipa até o organizador as atualizar.
      await manager.delete(TeamAssignment, { gameId, userId });
      if (confirmedLeft) promotedIds = await promoteFromWaiting(manager, game);

      return this.buildDetail(manager, gameId);
    });

    await this.notifyChanged(detail, promotedIds);
    if (confirmedLeft && promotedIds.length === 0)
      await this.notifyMissingPlayers(detail, userId);
    return detail;
  }

  async setPaid(
    gameId: string,
    targetUserId: string,
    organizerId: string,
    paid: boolean,
  ): Promise<GameDetailDto> {
    const detail = await this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, gameId);
      if (game.organizerId !== organizerId) {
        throw new ForbiddenException(
          'Só o organizador pode marcar pagamentos.',
        );
      }

      const row = await manager.findOne(Participation, {
        where: { gameId, userId: targetUserId },
      });
      if (!row || row.status === 'left') {
        throw new NotFoundException('Participação não encontrada.');
      }
      if (row.status !== 'confirmed') {
        throw new ConflictException(
          'Só podes marcar pagamento de jogadores confirmados.',
        );
      }

      row.paid = paid;
      await manager.save(row);
      return this.buildDetail(manager, gameId);
    });

    this.gamesGateway.emitGameUpdated(gameId, detail);
    return detail;
  }

  /**
   * Depois de uma mudança já gravada: atualiza os ecrãs abertos (socket) e avisa por push
   * quem subiu da lista de espera. Usado ao editar o jogo (ex.: mais vagas).
   */
  async afterGameChanged(
    gameId: string,
    promotedIds: string[] = [],
  ): Promise<void> {
    try {
      const detail = await this.getDetail(gameId);
      await this.notifyChanged(detail, promotedIds);
    } catch (err) {
      // A edição já está gravada: um erro aqui não a pode transformar num 500.
      this.logger.warn(
        `Falha ao avisar alterações do jogo ${gameId}: ${(err as Error).message}`,
      );
    }
  }

  /** Jogo cancelado: atualiza os ecrãs e avisa quem estava confirmado ou em espera. */
  async afterGameCancelled(
    gameId: string,
    organizerId: string,
  ): Promise<GameDetailDto> {
    const detail = await this.getDetail(gameId);
    this.gamesGateway.emitGameUpdated(gameId, detail);
    const people = detail.participations
      .map((p) => p.userId)
      .filter((id) => id !== organizerId);
    if (people.length > 0) {
      const when = new Date(detail.startsAt).toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      await this.push.send(
        people,
        'Jogo cancelado',
        `"${detail.title}" de ${when} foi cancelado pelo organizador.`,
        { gameId },
      );
    }
    return detail;
  }

  private async notifyChanged(detail: GameDetailDto, promotedIds: string[]) {
    this.gamesGateway.emitGameUpdated(detail.id, detail);
    if (promotedIds.length > 0) {
      await this.push.send(
        promotedIds,
        'Entraste na convocatória',
        `Abriu uma vaga: estás confirmado em "${detail.title}".`,
        { gameId: detail.id },
      );
    }
  }

  /** Um confirmado desistiu e ninguém estava à espera: avisar o organizador. */
  private async notifyMissingPlayers(detail: GameDetailDto, leaverId: string) {
    const missing = detail.slots - detail.confirmedCount;
    const upcoming = new Date(detail.startsAt).getTime() > Date.now();
    if (missing <= 0 || !upcoming || detail.organizerId === leaverId) return;
    await this.push.send(
      [detail.organizerId],
      'Faltam jogadores',
      `${missing === 1 ? 'Falta 1 jogador' : `Faltam ${missing} jogadores`} em "${detail.title}".`,
      { gameId: detail.id },
    );
  }

  private async buildDetail(
    manager: EntityManager,
    gameId: string,
  ): Promise<GameDetailDto> {
    const game = await manager.findOne(Game, {
      where: { id: gameId },
      relations: { group: true },
    });
    if (!game) throw new NotFoundException('Jogo não encontrado.');

    const rows = await manager.find(Participation, {
      where: {
        gameId,
        status: In(['confirmed', 'waiting'] satisfies ParticipationStatus[]),
      },
      order: { position: 'ASC' },
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users =
      userIds.length === 0
        ? []
        : await manager.findBy(User, { id: In(userIds) });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const participations = rows.map((p) =>
      toParticipationDto(p, nameById.get(p.userId) ?? 'Jogador'),
    );
    const confirmed = participations.filter((p) => p.status === 'confirmed');

    return {
      ...toGameDto(game),
      confirmedCount: confirmed.length,
      waitingCount: participations.filter((p) => p.status === 'waiting').length,
      participations,
      teams: await this.loadTeams(manager, gameId, confirmed),
    };
  }

  /** Equipas guardadas, só com quem ainda está confirmado, pela ordem da convocatória. */
  private async loadTeams(
    manager: EntityManager,
    gameId: string,
    confirmed: ParticipationDto[],
  ): Promise<TeamDto[]> {
    const assignments = await manager.findBy(TeamAssignment, { gameId });
    if (assignments.length === 0) return [];

    const teamByUser = new Map(assignments.map((a) => [a.userId, a.team]));
    const teams = new Map<string, TeamDto>();
    for (const name of [...new Set(assignments.map((a) => a.team))].sort()) {
      teams.set(name, { name, players: [] });
    }
    for (const p of confirmed) {
      const team = teamByUser.get(p.userId);
      if (team)
        teams.get(team)!.players.push({ userId: p.userId, name: p.userName });
    }
    return [...teams.values()];
  }
}
