import { Module } from '@nestjs/common';
import {
  GroupInvitesController,
  GroupsController,
} from './groups.controller.js';
import { GroupsService } from './groups.service.js';

@Module({
  controllers: [GroupsController, GroupInvitesController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
