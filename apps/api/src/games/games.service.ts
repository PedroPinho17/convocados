import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource } from 'typeorm';
import { Game, Group, Venue } from '@convocados/db';
import type {
  CreateGameInput,
  GameDetailDto,
  GameDto,
  UpdateGameInput,
} from '@convocados/shared';
import {
  countByStatus,
  lockGame,
  ParticipationsService,
  promoteFromWaiting,
  toGameDto,
} from '../participations/participations.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { PushService } from '../push/push.service.js';

/** 12 hex = 48 bits: curto para o link/QR e impossível de adivinhar à força. */
export const INVITE_CODE_RE = /^[0-9a-f]{8,32}$/;
function newInviteCode() {
  return randomBytes(6).toString('hex');
}

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly participations: ParticipationsService,
    private readonly groups: GroupsService,
    private readonly push: PushService,
  ) {}

  /** O campo escolhido tem de existir (senão a FK dava erro 500). */
  private async assertVenue(venueId: string | null | undefined) {
    if (!venueId) return;
    const exists = await this.dataSource.manager.existsBy(Venue, {
      id: venueId,
    });
    if (!exists) throw new BadRequestException('Esse campo não existe.');
  }

  private get games() {
    return this.dataSource.getRepository(Game);
  }

  async create(organizerId: string, input: CreateGameInput): Promise<GameDto> {
    // Num grupo só cria jogos quem é membro.
    if (input.groupId)
      await this.groups.assertMember(input.groupId, organizerId);
    await this.assertVenue(input.venueId);

    const game = await this.games.save(
      this.games.create({
        title: input.title,
        location: input.location,
        startsAt: new Date(input.startsAt),
        slots: input.slots,
        subs: input.subs,
        totalPriceCents: input.totalPriceCents,
        sport: input.sport ?? 'football',
        venueId: input.venueId ?? null,
        groupId: input.groupId ?? null,
        organizerId,
        inviteCode: newInviteCode(),
        status: 'open',
      }),
    );
    if (game.groupId) {
      game.group = await this.dataSource.manager.findOneBy(Group, {
        id: game.groupId,
      });
      await this.notifyGroup(game, organizerId);
    }
    return toGameDto(game);
  }

  /** Jogo novo num grupo: aviso a todos os membros (menos a quem o criou). */
  private async notifyGroup(game: Game, organizerId: string) {
    try {
      const people = (await this.groups.memberIds(game.groupId!)).filter(
        (id) => id !== organizerId,
      );
      if (people.length === 0) return;
      const when = game.startsAt.toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      await this.push.send(
        people,
        `Novo jogo em ${game.group?.name ?? 'o teu grupo'}`,
        `${game.title} · ${when}. Confirma já a tua vaga.`,
        { gameId: game.id },
      );
    } catch (err) {
      // O jogo já está criado: um aviso que falha não o pode desfazer.
      this.logger.warn(
        `Falha ao avisar o grupo do jogo ${game.id}: ${(err as Error).message}`,
      );
    }
  }

  /** Jogos que organizo, em que estou confirmado ou em espera, e os dos meus grupos. */
  async listMine(userId: string): Promise<GameDto[]> {
    const rows = await this.games
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.group', 'grp')
      .leftJoin(
        'participations',
        'p',
        `p."gameId" = g.id AND p."userId" = :userId AND p.status IN ('confirmed', 'waiting')`,
        { userId },
      )
      .where(
        new Brackets((qb) => {
          qb.where('g.organizerId = :userId', { userId })
            .orWhere('p.id IS NOT NULL')
            .orWhere(
              `g."groupId" IN (SELECT gm."groupId" FROM "group_members" gm WHERE gm."userId" = :userId)`,
            );
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

  async update(
    id: string,
    userId: string,
    input: UpdateGameInput,
  ): Promise<GameDto> {
    await this.assertVenue(input.venueId);
    const { dto, promotedIds } = await this.dataSource.transaction(
      async (manager) => {
        // Trancado como no confirmar: mudar vagas não pode correr ao mesmo tempo que uma confirmação.
        const game = await lockGame(manager, id);
        if (game.organizerId !== userId) {
          throw new ForbiddenException(
            'Só o organizador pode editar este jogo.',
          );
        }
        if (game.status === 'cancelled') {
          throw new ConflictException('Este jogo foi cancelado.');
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
          const stillWaiting = Math.max(
            0,
            waiting - Math.max(0, slots - confirmed),
          );
          if (input.subs < stillWaiting) {
            throw new ConflictException(
              `Há ${stillWaiting} pessoas em lista de espera: os suplentes não podem ser menos do que isso.`,
            );
          }
        }

        if (input.title !== undefined) game.title = input.title;
        if (input.location !== undefined) game.location = input.location;
        if (input.startsAt !== undefined)
          game.startsAt = new Date(input.startsAt);
        if (input.slots !== undefined) game.slots = input.slots;
        if (input.subs !== undefined) game.subs = input.subs;
        if (input.totalPriceCents !== undefined)
          game.totalPriceCents = input.totalPriceCents;
        if (input.sport !== undefined) game.sport = input.sport;
        if (input.venueId !== undefined) game.venueId = input.venueId;
        const saved = await manager.save(game);

        // Mais vagas → os primeiros da lista de espera entram logo.
        const promotedIds = await promoteFromWaiting(manager, saved);
        return { dto: toGameDto(saved), promotedIds };
      },
    );

    // Depois do commit: ecrãs abertos atualizam (hora, vagas, listas) e os promovidos recebem push.
    await this.participations.afterGameChanged(id, promotedIds);
    return dto;
  }

  /**
   * O organizador cancela o jogo (ex.: chuva). Fica visível como cancelado, deixa de
   * aceitar confirmações, e quem estava confirmado ou em espera recebe uma notificação.
   * Os lembretes saem sozinhos: a lista de lembretes só tem jogos abertos.
   */
  async cancel(id: string, userId: string): Promise<GameDetailDto> {
    const changed = await this.dataSource.transaction(async (manager) => {
      const game = await lockGame(manager, id);
      if (game.organizerId !== userId) {
        throw new ForbiddenException(
          'Só o organizador pode cancelar este jogo.',
        );
      }
      if (game.status === 'cancelled') return false; // já estava: não avisa outra vez
      if (game.status !== 'open') {
        throw new ConflictException('Este jogo já terminou.');
      }
      game.status = 'cancelled';
      await manager.save(game);
      return true;
    });
    return changed
      ? this.participations.afterGameCancelled(id, userId)
      : this.participations.getDetail(id);
  }
}
