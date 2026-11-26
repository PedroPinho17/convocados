import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module.js';
import { ParticipationsModule } from '../participations/participations.module.js';
import { PushModule } from '../push/push.module.js';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';

@Module({
  imports: [ParticipationsModule, GroupsModule, PushModule],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
