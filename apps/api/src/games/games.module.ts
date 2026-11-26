import { Module } from '@nestjs/common';
import { ParticipationsModule } from '../participations/participations.module.js';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';

@Module({
  imports: [ParticipationsModule],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
