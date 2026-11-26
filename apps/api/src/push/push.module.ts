import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from '@convocados/db';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
