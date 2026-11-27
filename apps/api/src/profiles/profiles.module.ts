import { Module } from '@nestjs/common';
import {
  MeProfileController,
  UsersProfileController,
} from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  controllers: [MeProfileController, UsersProfileController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
