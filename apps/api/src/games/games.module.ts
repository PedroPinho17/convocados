import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@convocados/db';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}