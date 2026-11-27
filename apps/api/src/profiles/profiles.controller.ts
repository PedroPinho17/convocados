import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  updateProfileSchema,
  type PlayerProfileDto,
  type UpdateProfileInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ProfilesService } from './profiles.service.js';

@Controller('me')
export class MeProfileController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('profile')
  mine(@CurrentUser() user: UserDto): Promise<PlayerProfileDto> {
    return this.profiles.getById(user.id);
  }

  @Patch('profile')
  updateMine(
    @CurrentUser() user: UserDto,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileInput,
  ): Promise<PlayerProfileDto> {
    return this.profiles.update(user.id, body);
  }
}

@Controller('users')
export class UsersProfileController {
  constructor(private readonly profiles: ProfilesService) {}

  /** Vista pública segura: sem email nem dados privados. */
  @Get(':id/profile')
  publicProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerProfileDto> {
    return this.profiles.getById(id);
  }
}
