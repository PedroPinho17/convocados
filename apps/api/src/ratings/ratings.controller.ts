import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  upsertRatingSchema,
  type RatingDto,
  type UpsertRatingInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { RatingsService } from './ratings.service.js';

@Controller('games/:gameId/ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  listMine(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
  ): Promise<RatingDto[]> {
    return this.ratings.listMine(gameId, user.id);
  }

  @Post()
  upsert(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @CurrentUser() user: UserDto,
    @Body({ schema: upsertRatingSchema }) body: UpsertRatingInput,
  ): Promise<RatingDto> {
    return this.ratings.upsert(gameId, user.id, body);
  }
}
