import { Body, Controller, Delete, HttpCode, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  deleteAccountSchema,
  type DeleteAccountInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser, type AuthedRequest } from '../auth/auth.decorators.js';
import { AuthService } from '../auth/auth.service.js';
import { AccountService } from './account.service.js';

@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
  ) {}

  /** Pede a password outra vez (como o login: 10 tentativas por minuto). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete()
  @HttpCode(204)
  async delete(
    @CurrentUser() user: UserDto,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body({ schema: deleteAccountSchema }) body: DeleteAccountInput,
  ): Promise<void> {
    await this.account.delete(user.id, body.password);
    // A sessão já foi apagada em cascata; aqui só se limpa o cookie da web.
    await this.auth.endSession(req.sessionTokenHash, res);
  }
}
