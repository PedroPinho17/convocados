import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './auth/auth.decorators.js';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Confirma também a base de dados (para o deploy e para quem quer saber se está tudo bem). */
  @Public()
  @Get()
  async check() {
    await this.db.query('SELECT 1');
    return { status: 'ok' };
  }

  /**
   * Só a API, sem tocar na base de dados: é a que o ping de "manter acordado" usa
   * (.github/workflows/keep-alive.yml). Se fosse o /health, o Neon nunca adormecia e
   * gastava as horas de computação do plano gratuito.
   */
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}