import { join } from 'node:path';
import { DataSource } from 'typeorm';
import {
  User,
  Game,
  Session,
  Participation,
  PushToken,
  Rating,
  TeamAssignment,
  AiUsage,
  PasswordReset,
} from '@convocados/db';

import { Init1795621974591 } from './migrations/1795621974591-Init.js';
import { AddSessions1795622437573 } from './migrations/1795622437573-AddSessions.js';
import { GameTotalPrice1795635429286 } from './migrations/1795635429286-GameTotalPrice.js';
import { AddParticipations1795651970417 } from './migrations/1795651970417-AddParticipations.js';
import { AddPushTokens1795700000000 } from './migrations/1795700000000-AddPushTokens.js';
import { UserReminders1795710000000 } from './migrations/1795710000000-UserReminders.js';
import { AddRatings1795720000000 } from './migrations/1795720000000-AddRatings.js';
import { AddTeams1795730000000 } from './migrations/1795730000000-AddTeams.js';
import { AddAiUsage1795740000000 } from './migrations/1795740000000-AddAiUsage.js';
import { AddPasswordResets1795750000000 } from './migrations/1795750000000-AddPasswordResets.js';

export const entities = [
  User,
  Game,
  Session,
  Participation,
  PushToken,
  Rating,
  TeamAssignment,
  AiUsage,
  PasswordReset,
];
export const migrations = [
  Init1795621974591,
  AddSessions1795622437573,
  GameTotalPrice1795635429286,
  AddParticipations1795651970417,
  AddPushTokens1795700000000,
  UserReminders1795710000000,
  AddRatings1795720000000,
  AddTeams1795730000000,
  AddAiUsage1795740000000,
  AddPasswordResets1795750000000,
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
