import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import {
  registerPushTokenSchema,
  reminderSettingsSchema,
  unregisterPushTokenSchema,
  type RegisterPushTokenInput,
  type ReminderSettingsInput,
  type RemindersDto,
  type UnregisterPushTokenInput,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { PushService } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('register')
  @HttpCode(204)
  async register(
    @CurrentUser() user: UserDto,
    @Body({ schema: registerPushTokenSchema }) body: RegisterPushTokenInput,
  ): Promise<void> {
    await this.push.register(user.id, body);
  }

  @Post('unregister')
  @HttpCode(204)
  async unregister(
    @CurrentUser() user: UserDto,
    @Body({ schema: unregisterPushTokenSchema }) body: UnregisterPushTokenInput,
  ): Promise<void> {
    await this.push.unregister(user.id, body.token);
  }

  /** Definições dos lembretes + jogos confirmados, para o telemóvel os agendar. */
  @Get('reminders')
  getReminders(@CurrentUser() user: UserDto): Promise<RemindersDto> {
    return this.push.getReminders(user.id);
  }

  @Put('reminders')
  setReminders(
    @CurrentUser() user: UserDto,
    @Body({ schema: reminderSettingsSchema }) body: ReminderSettingsInput,
  ): Promise<RemindersDto> {
    return this.push.setReminders(user.id, body);
  }
}
