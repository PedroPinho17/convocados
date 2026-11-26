import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  generateTeamsSchema,
  type GameDetailDto,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { TeamsService } from './teams.service.js';

/** As equipas guardadas vêm no detalhe do jogo (GET /games/:id/detail). */
@Controller('games/:gameId/teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @HttpCode(200)
  generate(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
    @Body({ schema: generateTeamsSchema }) body: { teamCount: number },
  ): Promise<GameDetailDto> {
    return this.teams.generate(gameId, user.id, body.teamCount);
  }
}
