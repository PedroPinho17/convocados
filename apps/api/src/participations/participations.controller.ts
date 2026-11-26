import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { GameDetailDto, UserDto } from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ParticipationsService } from './participations.service.js';

@Controller('games/:gameId')
export class ParticipationsController {
  constructor(private readonly participations: ParticipationsService) {}

  @Get('detail')
  getDetail(@Param('gameId', ParseUUIDPipe) gameId: string): Promise<GameDetailDto> {
    return this.participations.getDetail(gameId);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
  ): Promise<GameDetailDto> {
    return this.participations.confirm(gameId, user.id);
  }

  @Post('leave')
  @HttpCode(200)
  leave(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
  ): Promise<GameDetailDto> {
    return this.participations.leave(gameId, user.id);
  }
}