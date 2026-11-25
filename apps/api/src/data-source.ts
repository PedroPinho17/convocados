import { join } from 'node:path';
import { DataSource } from 'typeorm';

export const entities = [];
export const migrations = [];

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