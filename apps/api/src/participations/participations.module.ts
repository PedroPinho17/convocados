import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { InvitesController } from './invites.controller.js';
import { ParticipationsController } from './participations.controller.js';
import { ParticipationsService } from './participations.service.js';

@Module({
  imports: [RealtimeModule, PushModule],
  providers: [ParticipationsService],
  controllers: [ParticipationsController, InvitesController],
  exports: [ParticipationsService],
})
export class ParticipationsModule {}
