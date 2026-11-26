import { Module } from '@nestjs/common';
import { ParticipationsModule } from '../participations/participations.module.js';
import { RatingsModule } from '../ratings/ratings.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

@Module({
  imports: [RatingsModule, ParticipationsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
