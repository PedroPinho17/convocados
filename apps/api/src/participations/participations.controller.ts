import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  setPaidSchema,
  type GameDetailDto,
  type SetPaidInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ParticipationsService } from './participations.service.js';

@Controller('games/:gameId')
export class ParticipationsController {
  constructor(private readonly participations: ParticipationsService) {}

  @Get('detail')
  getDetail(
    @Param('gameId', ParseUUIDPipe) gameId: string,
  ): Promise<GameDetailDto> {
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
