import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GamesGateway } from './games.gateway.js';

@Module({
  imports: [AuthModule],
  providers: [GamesGateway],
  exports: [GamesGateway],
})
export class RealtimeModule {}
