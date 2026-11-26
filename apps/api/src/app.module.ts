import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClientIpThrottlerGuard } from './auth/client-ip.js';
import { HealthController } from './health.controller.js';
import { validateEnv, type Env } from './config.js';
import { entities, migrations } from './data-source.js';
import { GamesModule } from './games/games.module.js';
import { ParticipationsModule } from './participations/participations.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { PushModule } from './push/push.module.js';
import { RatingsModule } from './ratings/ratings.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { AiModule } from './ai/ai.module.js';
import { AccountModule } from './account/account.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { VenuesModule } from './venues/venues.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const synchronize = config.get('DB_SYNCHRONIZE', { infer: true });
        return {
          type: 'postgres' as const,
          url: config.get('DATABASE_URL', { infer: true }),
          entities,
          migrations,
          synchronize,
          migrationsRun: !synchronize,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const disabled = config.get('RATE_LIMIT_DISABLED', { infer: true });
        return {
          throttlers: [
            {
              ttl: 60_000,
              limit: config.get('RATE_LIMIT_PER_MIN', { infer: true }),
            },
          ],
          skipIf: () => disabled,
        };
      },
    }),
    AuthModule,
    GamesModule,
    ParticipationsModule,
    RealtimeModule,
    PushModule,
    RatingsModule,
    TeamsModule,
    AiModule,
    AccountModule,
    GroupsModule,
    VenuesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
})
export class AppModule {}
