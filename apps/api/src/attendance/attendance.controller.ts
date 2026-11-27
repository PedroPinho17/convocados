import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { AttendanceForecastDto, UserDto } from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AttendanceService } from './attendance.service.js';

@Controller('games')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get(':id/attendance-forecast')
  forecast(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
  ): Promise<AttendanceForecastDto> {
    return this.attendance.forecast(id, user.id);
  }
}
