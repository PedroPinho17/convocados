import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User, Game } from '@convocados/db';

import { Init1795621974591 } from './migrations/1795621974591-Init.js';

export const entities = [User, Game];
export const migrations = [Init1795621974591];

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