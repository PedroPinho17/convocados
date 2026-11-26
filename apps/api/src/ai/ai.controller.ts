import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  parseGameMessageSchema,
  type ParseGameMessageInput,
  type ParseGameResultDto,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AiService } from './ai.service.js';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('parse-game')
  @HttpCode(200)
  parseGame(
    @CurrentUser() user: UserDto,
    @Body({ schema: parseGameMessageSchema }) body: ParseGameMessageInput,
  ): Promise<ParseGameResultDto> {
    return this.ai.parseGame(user.id, body.message);
  }
}
