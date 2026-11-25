import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User, Game, Session } from '@convocados/db';

import { Init1795621974591 } from './migrations/1795621974591-Init.js';
import { AddSessions1795622437573 } from './migrations/1795622437573-AddSessions.js';
import { GameTotalPrice1795635429286 } from './migrations/1795635429286-GameTotalPrice.js';

export const entities = [User, Game, Session];
export const migrations = [
  Init1795621974591,
  AddSessions1795622437573,
  GameTotalPrice1795635429286,
];

try {
  process.loadEnvFile(join(import.meta.dirname, '..', '..', '..', '.env'));
} catch {
  // Sem .env → variáveis do ambiente.
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations,
});