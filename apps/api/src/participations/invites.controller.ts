import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { GameInviteDto } from '@convocados/shared';
import { Public } from '../auth/auth.decorators.js';
import { normalizeInviteCode } from '../games/game-access.js';
import { ParticipationsService } from './participations.service.js';

@Controller('invites')
export class InvitesController {
  constructor(private readonly participations: ParticipationsService) {}

  /**
   * Página de convite: legível sem login, por isso só com o essencial (sem pagamentos).
   * Limite apertado para não se adivinharem códigos.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':code')
  getByCode(@Param('code') raw: string): Promise<GameInviteDto> {
    const code = normalizeInviteCode(raw);
    if (!code) {
      throw new NotFoundException('Convite inválido ou jogo não encontrado.');
    }
    return this.participations.getInvite(code);
  }
}
