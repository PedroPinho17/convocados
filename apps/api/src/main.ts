import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.disable('x-powered-by');
  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}
await bootstrap();
