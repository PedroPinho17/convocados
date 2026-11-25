import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.register(body), res);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.login(body), res);
  }

  @Public()
  @Post('mobile/register')
  async mobileRegister(@Body({ schema: registerSchema }) body: RegisterInput) {
    return this.auth.startTokenSession(await this.auth.register(body));
  }

  @Public()
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
