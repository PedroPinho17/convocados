import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource } from 'typeorm';
import { Game } from '@convocados/db';
import type { CreateGameInput, GameDto, UpdateGameInput } from '@convocados/shared';
import {
  countByStatus,
  lockGame,
  promoteFromWaiting,
  toGameDto,
} from '../participations/participations.service.js';

/** 12 hex = 48 bits: curto para o link/QR e impossível de adivinhar à força. */
export const INVITE_CODE_RE = /^[0-9a-f]{8,32}$/;
function newInviteCode() {
  return randomBytes(6).toString('hex');
}

@Injectable()
export class GamesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get games() {
    return this.dataSource.getRepository(Game);
  }

  async create(organizerId: string, input: CreateGameInput): Promise<GameDto> {
    const game = await this.games.save(
      this.games.create({
        ...input,
        startsAt: new Date(input.startsAt),
        organizerId,
        inviteCode: newInviteCode(),
        status: 'open',
      }),
    );
    return toGameDto(game);
  }

  /** Jogos que organizo + jogos em que estou confirmado ou em espera. */
  async listMine(userId: string): Promise<GameDto[]> {
    const rows = await this.games
      .createQueryBuilder('g')
      .leftJoin(
        'participations',
        'p',
        `p."gameId" = g.id AND p."userId" = :userId AND p.status IN ('confirmed', 'waiting')`,
        { userId },
      )
      .where(
        new Brackets((qb) => {
          qb.where('g.organizerId = :userId', { userId }).orWhere('p.id IS NOT NULL');
        }),
      )
      .orderBy('g.startsAt', 'ASC')
      .getMany();
    return rows.map(toGameDto);
  }

  async get(id: string): Promise<GameDto> {
    const game = await this.games.findOneBy({ id });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    return toGameDto(game);
  }

  async update(id: string, userId: string, input: UpdateGameInput): Promise<GameDto> {
    return this.dataSource.transaction(async (manager) => {
      // Trancado como no confirmar: mudar vagas não pode correr ao mesmo tempo que uma confirmação.
      const game = await lockGame(manager, id);
      if (game.organizerId !== userId) {
        throw new ForbiddenException('Só o organizador pode editar este jogo.');
      }

      const { confirmed, waiting } = await countByStatus(manager, id);
      if (input.slots !== undefined && input.slots < confirmed) {
        throw new ConflictException(
          `Já há ${confirmed} confirmados: as vagas não podem ser menos do que isso.`,
        );
      }
      if (input.subs !== undefined) {
        const slots = input.slots ?? game.slots;
        // Quem sobe da espera para as vagas novas deixa de contar para a lista de espera.
        const stillWaiting = Math.max(0, waiting - Math.max(0, slots - confirmed));
        if (input.subs < stillWaiting) {
          throw new ConflictException(
            `Há ${stillWaiting} pessoas em lista de espera: os suplentes não podem ser menos do que isso.`,
          );
        }
      }

      if (input.title !== undefined) game.title = input.title;
      if (input.location !== undefined) game.location = input.location;
      if (input.startsAt !== undefined) game.startsAt = new Date(input.startsAt);
      if (input.slots !== undefined) game.slots = input.slots;
      if (input.subs !== undefined) game.subs = input.subs;
      if (input.totalPriceCents !== undefined) game.totalPriceCents = input.totalPriceCents;
      const saved = await manager.save(game);

      // Mais vagas → os primeiros da lista de espera entram logo.
      await promoteFromWaiting(manager, saved);
      return toGameDto(saved);
    });
  }
}
