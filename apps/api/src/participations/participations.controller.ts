import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  setPaidSchema,
  type GameDetailDto,
  type SetPaidInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { normalizeInviteCode } from '../games/game-access.js';
import { ParticipationsService } from './participations.service.js';

/**
 * Detalhe, confirmar e desistir: só quem tem acesso ao jogo (ver games/game-access.ts).
 * Quem chega pelo link do convite manda o código em `?invite=<código>`.
 */
@Controller('games/:gameId')
export class ParticipationsController {
  constructor(private readonly participations: ParticipationsService) {}

  @Get('detail')
  getDetail(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
    @Query('invite') invite?: string,
  ): Promise<GameDetailDto> {
    return this.participations.getDetailFor(
      gameId,
      user.id,
      normalizeInviteCode(invite),
    );
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
    @Query('invite') invite?: string,
  ): Promise<GameDetailDto> {
    return this.participations.confirm(
      gameId,
      user.id,
      normalizeInviteCode(invite),
    );
  }

  @Post('leave')
  @HttpCode(200)
  leave(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
    @Query('invite') invite?: string,
  ): Promise<GameDetailDto> {
    return this.participations.leave(
      gameId,
      user.id,
      normalizeInviteCode(invite),
    );
  }

  @Patch('participations/:userId/paid')
  setPaid(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: UserDto,
    @Body({ schema: setPaidSchema }) body: SetPaidInput,
  ): Promise<GameDetailDto> {
    return this.participations.setPaid(gameId, userId, user.id, body.paid);
  }
}
