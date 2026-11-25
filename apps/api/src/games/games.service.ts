import { createHash, randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '@convocados/db';
import type { CreateGameInput, GameDto, UpdateGameInput } from '@convocados/shared';

const toDto = (g: Game): GameDto => ({
  id: g.id,
  organizerId: g.organizerId,
  title: g.title,
  location: g.location,
  startsAt: g.startsAt.toISOString(),
  slots: g.slots,
  subs: g.subs,
  priceCents: g.priceCents,
  inviteCode: g.inviteCode,
  status: g.status,
  createdAt: g.createdAt.toISOString(),
});

function newInviteCode() {
  // 8 chars hex — curto para o link/QR; o índice unique trata colisões raras
  return createHash('sha256').update(randomBytes(16)).digest('hex').slice(0, 8);
}

@Injectable()
export class GamesService {
  constructor(@InjectRepository(Game) private readonly games: Repository<Game>) {}

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
    return toDto(game);
  }

  async listMine(organizerId: string): Promise<GameDto[]> {
    const rows = await this.games.find({
      where: { organizerId },
      order: { startsAt: 'ASC' },
    });
    return rows.map(toDto);
  }

  async get(id: string): Promise<GameDto> {
    const game = await this.games.findOneBy({ id });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    return toDto(game);
  }

  async update(id: string, userId: string, input: UpdateGameInput): Promise<GameDto> {
    const game = await this.games.findOneBy({ id });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    if (game.organizerId !== userId) {
      throw new ForbiddenException('Só o organizador pode editar este jogo.');
    }
    if (input.title !== undefined) game.title = input.title;
    if (input.location !== undefined) game.location = input.location;
    if (input.startsAt !== undefined) game.startsAt = new Date(input.startsAt);
    if (input.slots !== undefined) game.slots = input.slots;
    if (input.subs !== undefined) game.subs = input.subs;
    if (input.priceCents !== undefined) game.priceCents = input.priceCents;
    return toDto(await this.games.save(game));
  }
}