import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';
import { validateEnv, type Env } from './config.js';
import { entities, migrations } from './data-source.js';

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
  ],
  controllers: [HealthController],
})
export class AppModule {}