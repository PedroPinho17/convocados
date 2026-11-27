import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SocketTokenDto,
  type UserDto,
} from '@convocados/shared';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public, type AuthedRequest } from './auth.decorators.js';
import { PasswordResetService } from './password-reset.service.js';

/** Login: 10 tentativas por minuto e por IP (contra adivinhar passwords). */
const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };
/**
 * Registo: um pouco mais folgado que o login — os testes no browser criam várias contas
 * no mesmo IP; 10/min falhava no meio da suite quando um teste anterior era repetido.
 */
const REGISTER_LIMIT = { default: { limit: 30, ttl: 60_000 } };
/** Pedir o email de recuperação: poucos por minuto (cada um manda um email). */
const FORGOT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly resets: PasswordResetService,
  ) {}

  @Public()
  @Throttle(REGISTER_LIMIT)
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.register(body), res);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.login(body), res);
  }

  @Public()
  @Throttle(REGISTER_LIMIT)
  @Post('mobile/register')
  async mobileRegister(@Body({ schema: registerSchema }) body: RegisterInput) {
    return this.auth.startTokenSession(await this.auth.register(body));
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('mobile/login')
  @HttpCode(200)
  async mobileLogin(@Body({ schema: loginSchema }) body: LoginInput) {
    return this.auth.startTokenSession(await this.auth.login(body));
  }

  /** Sempre 204, exista ou não a conta: não se descobre quem está registado. */
  @Public()
  @Throttle(FORGOT_LIMIT)
  @Post('password/forgot')
  @HttpCode(204)
  async forgotPassword(
    @Body({ schema: forgotPasswordSchema }) body: ForgotPasswordInput,
  ): Promise<void> {
    await this.resets.request(body.email);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('password/reset')
  @HttpCode(204)
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordInput,
  ): Promise<void> {
    await this.resets.reset(body.token, body.password);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.endSession(req.sessionTokenHash, res);
  }

  @Get('me')
  me(@CurrentUser() user: UserDto): UserDto {
    return user;
  }

  /** Token curto para o socket da web (o cookie não chega à API pelo socket). */
  @Get('socket-token')
  socketToken(@CurrentUser() user: UserDto): SocketTokenDto {
    return this.auth.issueSocketToken(user.id);
  }
}
