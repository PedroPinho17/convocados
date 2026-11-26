import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Participation, TeamAssignment, User } from '@convocados/db';
import { balanceTeams, type GameDetailDto } from '@convocados/shared';
import {
  lockGame,
  ParticipationsService,
} from '../participations/participations.service.js';
import { RatingsService } from '../ratings/ratings.service.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ratings: RatingsService,
    private readonly participations: ParticipationsService,
  ) {}

  /**
   * O organizador gera as equipas com os confirmados de agora e guarda-as.
   * Todos veem as mesmas equipas (no detalhe do jogo e pelo socket), e estas não mudam
   * sozinhas quando alguém avalia: só quando o organizador as atualiza.
   */
  async generate(
    gameId: string,
    organizerId: string,
    teamCount: number,
  ): Promise<GameDetailDto> {
    await this.dataSource.transaction(async (manager) => {
      // Trancado: ninguém confirma nem desiste enquanto as equipas são feitas.
      const game = await lockGame(manager, gameId);
      if (game.organizerId !== organizerId) {
        throw new ForbiddenException('Só o organizador pode fazer as equipas.');
      }

      const rows = await manager.find(Participation, {
        where: { gameId, status: 'confirmed' },
        order: { position: 'ASC' },
      });
      if (rows.length < teamCount) {
        throw new ConflictException(
          `São precisos pelo menos ${teamCount} confirmados para fazer ${teamCount} equipas.`,
        );
      }

      const userIds = rows.map((r) => r.userId);
      const users = await manager.findBy(User, { id: In(userIds) });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      const skills = await this.ratings.averageScores(userIds);

      const teams = balanceTeams(
        userIds.map((userId) => ({
          userId,
          name: nameById.get(userId) ?? 'Jogador',
          skill: skills.get(userId) ?? 3,
        })),
        teamCount,
      );

      await manager.delete(TeamAssignment, { gameId });
      await manager.insert(
        TeamAssignment,
        teams.flatMap((t) =>
          t.players.map((p) => ({ gameId, userId: p.userId, team: t.name })),
        ),
      );
    });

    return this.participations.publish(gameId);
  }
}
