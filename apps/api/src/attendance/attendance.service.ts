import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Game, Participation, User } from '@convocados/db';
import type { AttendanceForecastDto } from '@convocados/shared';
import { predictProba, trainLogistic, type Sample } from './logistic.js';

const MIN_SAMPLES = 30;
const RETRAIN_MS = 60 * 60 * 1000;

type Cache = { weights: number[]; trainedAt: number; samples: number };

/**
 * Previsão de comparecimento: logística treinada em participações históricas.
 * Pesos em memória; no máximo 1 treino por hora.
 */
@Injectable()
export class AttendanceService {
  private cache: Cache | null = null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async forecast(
    gameId: string,
    viewerId: string,
  ): Promise<AttendanceForecastDto> {
    const game = await this.dataSource.manager.findOneBy(Game, { id: gameId });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    if (game.organizerId !== viewerId) {
      throw new ForbiddenException(
        'Só o organizador pode ver a previsão de comparecimento.',
      );
    }

    const confirmed = await this.dataSource.manager.find(Participation, {
      where: { gameId, status: 'confirmed' },
      order: { position: 'ASC' },
    });
    const userIds = confirmed.map((p) => p.userId);
    const users =
      userIds.length === 0
        ? []
        : await this.dataSource.manager.findBy(User, {
            id: In(userIds),
          });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    await this.ensureModel();

    const players = [];
    for (const p of confirmed) {
      const features = await this.featuresFor(p.userId, game, p.joinedAt);
      const showUp = await this.showUpRate(p.userId);
      const probability =
        this.cache && this.cache.samples >= MIN_SAMPLES
          ? predictProba(this.cache.weights, features)
          : showUp;
      players.push({
        userId: p.userId,
        name: nameById.get(p.userId) ?? 'Jogador',
        probability: Math.round(probability * 1000) / 1000,
      });
    }

    const expectedPlayers =
      Math.round(players.reduce((s, p) => s + p.probability, 0) * 10) / 10;
    const neededPlayers = game.slots;
    return {
      expectedPlayers,
      neededPlayers,
      riskOfNotFilling: expectedPlayers < neededPlayers,
      players,
    };
  }

  /** Expõe o treino para testes unitários. */
  trainFromSamples(samples: Sample[]): number[] {
    const weights = trainLogistic(samples);
    this.cache = {
      weights,
      trainedAt: Date.now(),
      samples: samples.length,
    };
    return weights;
  }

  clearCache() {
    this.cache = null;
  }

  private async ensureModel(now = Date.now()) {
    if (this.cache && now - this.cache.trainedAt < RETRAIN_MS) return;
    const samples = await this.loadTrainingSamples();
    if (samples.length < MIN_SAMPLES) {
      this.cache = { weights: [0], trainedAt: now, samples: samples.length };
      return;
    }
    this.cache = {
      weights: trainLogistic(samples),
      trainedAt: now,
      samples: samples.length,
    };
  }

  /**
   * Features: [showUpRate, daysToGame, weekday/6, hour/23, groupGames/10].
   * Normalizadas ~[0,1] para o GD.
   */
  private async featuresFor(
    userId: string,
    game: Game,
    joinedAt: Date,
  ): Promise<number[]> {
    const showUp = await this.showUpRate(userId);
    const days = Math.max(
      0,
      (game.startsAt.getTime() - joinedAt.getTime()) / 86_400_000,
    );
    const weekday = game.startsAt.getUTCDay() / 6;
    const hour = game.startsAt.getUTCHours() / 23;
    const groupGames = game.groupId
      ? await this.groupGameCount(userId, game.groupId)
      : 0;
    return [
      showUp,
      Math.min(days / 14, 1),
      weekday,
      hour,
      Math.min(groupGames / 10, 1),
    ];
  }

  /** Taxa histórica: confirmados / (confirmados + left) em jogos já começados. */
  async showUpRate(userId: string, now = new Date()): Promise<number> {
    const rows: { status: string; n: string }[] = await this.dataSource.query(
      `SELECT p.status, COUNT(*)::text AS n
       FROM participations p
       INNER JOIN games g ON g.id = p."gameId"
       WHERE p."userId" = $1
         AND p.status IN ('confirmed', 'left')
         AND g."startsAt" <= $2
       GROUP BY p.status`,
      [userId, now],
    );
    let confirmed = 0;
    let left = 0;
    for (const r of rows) {
      if (r.status === 'confirmed') confirmed = Number(r.n);
      if (r.status === 'left') left = Number(r.n);
    }
    const total = confirmed + left;
    if (total === 0) return 0.75; // prior neutro-otimista
    return confirmed / total;
  }

  private async groupGameCount(
    userId: string,
    groupId: string,
  ): Promise<number> {
    const rows: { n: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::text AS n
       FROM participations p
       INNER JOIN games g ON g.id = p."gameId"
       WHERE p."userId" = $1 AND g."groupId" = $2 AND p.status = 'confirmed'`,
      [userId, groupId],
    );
    return Number(rows[0]?.n ?? 0);
  }

  private async loadTrainingSamples(now = new Date()): Promise<Sample[]> {
    const rows: {
      userId: string;
      status: string;
      joinedAt: Date;
      startsAt: Date;
      groupId: string | null;
    }[] = await this.dataSource.query(
      `SELECT p."userId", p.status, p."joinedAt", g."startsAt", g."groupId"
       FROM participations p
       INNER JOIN games g ON g.id = p."gameId"
       WHERE p.status IN ('confirmed', 'left')
         AND g."startsAt" <= $1
         AND g.status <> 'cancelled'
       ORDER BY g."startsAt" ASC
       LIMIT 5000`,
      [now],
    );

    const samples: Sample[] = [];
    // Taxas e contagens acumuladas por utilizador à medida que avançamos no tempo.
    const stats = new Map<string, { confirmed: number; left: number }>();
    const groupStats = new Map<string, number>();

    for (const row of rows) {
      const st = stats.get(row.userId) ?? { confirmed: 0, left: 0 };
      const total = st.confirmed + st.left;
      const showUp = total === 0 ? 0.75 : st.confirmed / total;
      const days = Math.max(
        0,
        (new Date(row.startsAt).getTime() - new Date(row.joinedAt).getTime()) /
          86_400_000,
      );
      const starts = new Date(row.startsAt);
      const gkey = row.groupId ? `${row.userId}:${row.groupId}` : null;
      const groupGames = gkey ? (groupStats.get(gkey) ?? 0) : 0;
      const x = [
        showUp,
        Math.min(days / 14, 1),
        starts.getUTCDay() / 6,
        starts.getUTCHours() / 23,
        Math.min(groupGames / 10, 1),
      ];
      samples.push({
        x,
        y: row.status === 'confirmed' ? 1 : 0,
      });

      if (row.status === 'confirmed') st.confirmed++;
      else st.left++;
      stats.set(row.userId, st);
      if (gkey && row.status === 'confirmed') {
        groupStats.set(gkey, groupGames + 1);
      }
    }
    return samples;
  }
}
