import { describe, expect, it } from 'vitest';
import {
  createGameSchema,
  generateTeamsSchema,
  registerPushTokenSchema,
  registerSchema,
  updateProfileSchema,
  upsertRatingSchema,
} from '../index';

/** Os mesmos schemas validam na API e nos formulários: um erro aqui chega aos três lados. */
describe('schemas partilhados', () => {
  const game = {
    title: 'Futebolada',
    location: 'Pavilhão',
    startsAt: '2030-01-10T21:00:00.000Z',
    slots: 10,
    subs: 2,
    totalPriceCents: 3000,
  };

  it('createGameSchema: limites de vagas, suplentes e preço', () => {
    expect(createGameSchema.safeParse(game).success).toBe(true);
    expect(createGameSchema.safeParse({ ...game, slots: 1 }).success).toBe(false);
    expect(createGameSchema.safeParse({ ...game, slots: 31 }).success).toBe(false);
    expect(createGameSchema.safeParse({ ...game, subs: -1 }).success).toBe(false);
    expect(createGameSchema.safeParse({ ...game, totalPriceCents: 1.5 }).success).toBe(false);
    expect(createGameSchema.safeParse({ ...game, startsAt: 'amanhã' }).success).toBe(false);
  });

  it('registerSchema: email em minúsculas e password de 10+ caracteres', () => {
    const parsed = registerSchema.safeParse({
      name: ' Rui ',
      email: ' Rui@Exemplo.PT ',
      password: 'password-longa',
    });
    expect(parsed.success && parsed.data.email).toBe('rui@exemplo.pt');
    expect(parsed.success && parsed.data.name).toBe('Rui');
    expect(
      registerSchema.safeParse({ name: 'Rui', email: 'rui@exemplo.pt', password: 'curta' })
        .success,
    ).toBe(false);
  });

  it('upsertRatingSchema: nota inteira de 1 a 5', () => {
    const toUserId = '0b8f1f4e-6a2b-4c3d-9e8f-1a2b3c4d5e6f';
    for (const score of [1, 3, 5]) {
      expect(upsertRatingSchema.safeParse({ toUserId, score }).success).toBe(true);
    }
    for (const score of [0, 6, 2.5]) {
      expect(upsertRatingSchema.safeParse({ toUserId, score }).success).toBe(false);
    }
    expect(upsertRatingSchema.safeParse({ toUserId: 'x', score: 3 }).success).toBe(false);
  });

  it('generateTeamsSchema: 2 equipas por defeito, semente opcional', () => {
    expect(generateTeamsSchema.parse({})).toEqual({ teamCount: 2 });
    expect(generateTeamsSchema.safeParse({ teamCount: 4, seed: 7 }).success).toBe(
      true,
    );
    expect(generateTeamsSchema.safeParse({ teamCount: 5 }).success).toBe(false);
    expect(generateTeamsSchema.safeParse({ teamCount: 1 }).success).toBe(false);
    expect(generateTeamsSchema.safeParse({ seed: 1.5 }).success).toBe(false);
  });

  it('registerPushTokenSchema: só tokens Expo', () => {
    const ok = (token: string) => registerPushTokenSchema.safeParse({ token }).success;
    expect(ok('ExponentPushToken[abcdefghijklmnopqrstuv]')).toBe(true);
    expect(ok('ExpoPushToken[abcdefghijklmnopqrstuvwx]')).toBe(true);
    expect(ok('https://evil.example/abcdefghijklmnop')).toBe(false);
  });

  it('updateProfileSchema: posição, pé e limites de cidade/bio', () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: ' Ana ',
        preferredPosition: 'GK',
        preferredFoot: 'LEFT',
        city: 'Porto',
        bio: 'Olá',
      }).success,
    ).toBe(true);
    expect(updateProfileSchema.safeParse({ preferredPosition: 'WINGER' }).success).toBe(
      false,
    );
    expect(updateProfileSchema.safeParse({ preferredFoot: 'CENTER' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ displayName: '' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ city: 'x'.repeat(81) }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ bio: 'x'.repeat(281) }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ preferredPosition: null, city: null }).success).toBe(
      true,
    );
  });
});
