import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ParticipationsModule } from '../participations/participations.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [AuthModule, ParticipationsModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
