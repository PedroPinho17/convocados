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
  createGameSchema,
  updateGameSchema,
  type CreateGameInput,
  type GameDetailDto,
  type GameDto,
  type UpdateGameInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { GamesService } from './games.service.js';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Post()
  create(
    @CurrentUser() user: UserDto,
    @Body({ schema: createGameSchema }) body: CreateGameInput,
  ): Promise<GameDto> {
    return this.games.create(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: UserDto): Promise<GameDto[]> {
    return this.games.listMine(user.id);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
  ): Promise<GameDto> {
    return this.games.get(id, user.id);
  }

  /** Só o organizador. Avisa por push quem estava confirmado ou em espera. */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
  ): Promise<GameDetailDto> {
    return this.games.cancel(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
    @Body({ schema: updateGameSchema }) body: UpdateGameInput,
  ): Promise<GameDto> {
    return this.games.update(id, user.id, body);
  }
}
