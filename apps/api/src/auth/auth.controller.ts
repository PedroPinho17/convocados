import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
  type UserDto,
} from '@convocados/shared';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public, type AuthedRequest } from './auth.decorators.js';

/** Login e registo: 10 tentativas por minuto e por IP (contra adivinhar passwords). */
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.register(body), res);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.login(body), res);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('mobile/register')
  async mobileRegister(@Body({ schema: registerSchema }) body: RegisterInput) {
    return this.auth.startTokenSession(await this.auth.register(body));
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('mobile/login')
  @HttpCode(200)
  async mobileLogin(@Body({ schema: loginSchema }) body: LoginInput) {
    return this.auth.startTokenSession(await this.auth.login(body));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.endSession(req.sessionTokenHash, res);
  }

  @Get('me')
  me(@CurrentUser() user: UserDto): UserDto {
    return user;
  }
}
