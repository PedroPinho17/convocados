import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session, User } from '@convocados/db';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { MailerService } from './mailer.service.js';
import { PasswordResetService } from './password-reset.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session])],
  providers: [
    AuthService,
    MailerService,
    PasswordResetService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
