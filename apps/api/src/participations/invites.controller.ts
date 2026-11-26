import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { GameDetailDto } from '@convocados/shared';
import { Public } from '../auth/auth.decorators.js';
import { INVITE_CODE_RE } from '../games/games.service.js';
import { ParticipationsService } from './participations.service.js';

@Controller('invites')
export class InvitesController {
  constructor(private readonly participations: ParticipationsService) {}

  /** Página de convite: legível sem login. Limite apertado para não se adivinharem códigos. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':code')
  getByCode(@Param('code') raw: string): Promise<GameDetailDto> {
    const code = raw.trim().toLowerCase();
    if (!INVITE_CODE_RE.test(code)) {
      throw new NotFoundException('Convite inválido ou jogo não encontrado.');
    }
    return this.participations.getDetailByInviteCode(code);
  }
}
