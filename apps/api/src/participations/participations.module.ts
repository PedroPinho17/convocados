import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller.js';
import { ParticipationsController } from './participations.controller.js';
import { ParticipationsService } from './participations.service.js';

@Module({
  providers: [ParticipationsService],
  controllers: [ParticipationsController, InvitesController],
  exports: [ParticipationsService],
})
export class ParticipationsModule {}