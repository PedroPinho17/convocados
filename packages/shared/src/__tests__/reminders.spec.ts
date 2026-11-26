import { describe, expect, it } from 'vitest';
import {
  formatReminder,
  planReminders,
  reminderSettingsSchema,
  REMINDER_OPTIONS,
} from '../index';

const MIN = 60_000;
const startsAt = Date.parse('2030-01-10T21:00:00.000Z');
const game = (gameId: string, iso = '2030-01-10T21:00:00.000Z') => ({
  gameId,
  title: 'Futebolada',
  location: 'Pavilhão',
  startsAt: iso,
});

describe('formatReminder', () => {
  it('mostra minutos, horas e dias', () => {
    expect(formatReminder(15)).toBe('15 min');
    expect(formatReminder(30)).toBe('30 min');
    expect(formatReminder(60)).toBe('1 h');
    expect(formatReminder(120)).toBe('2 h');
    expect(formatReminder(1440)).toBe('1 dia');
    expect(formatReminder(2880)).toBe('2 dias');
  });

  it('todas as opções têm texto', () => {
    for (const m of REMINDER_OPTIONS) expect(formatReminder(m)).not.toBe('');
  });
});

describe('reminderSettingsSchema', () => {
  const ok = (reminderMinutes: unknown) =>
    reminderSettingsSchema.safeParse({ reminderMinutes }).success;

  it('aceita até 3 valores da lista, ou nenhum', () => {
    expect(ok([120])).toBe(true);
    expect(ok([15, 60, 1440])).toBe(true);
    expect(ok([])).toBe(true);
  });

  it('recusa mais de 3, repetidos e valores fora da lista', () => {
    expect(ok([15, 30, 60, 120])).toBe(false);
    expect(ok([30, 30])).toBe(false);
    expect(ok([45])).toBe(false);
    expect(ok(['120'])).toBe(false);
  });
});

describe('planReminders', () => {
  it('por defeito: 1 lembrete 2 h antes', () => {
    const plan = planReminders([game('g1')], [120], startsAt - 10 * 60 * MIN);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      gameId: 'g1',
      at: startsAt - 120 * MIN,
      minutesBefore: 120,
      title: 'Futebolada daqui a 2 h',
    });
    expect(plan[0]!.body).toMatch(/^Pavilhão, às \d{2}:\d{2}\.$/);
  });

  it('não agenda lembretes que já passaram', () => {
    // Falta 1 h para o jogo: o de 2 h e o de 1 dia já passaram, o de 15 min ainda não.
    const plan = planReminders([game('g1')], [1440, 120, 15], startsAt - 60 * MIN);
    expect(plan.map((r) => r.minutesBefore)).toEqual([15]);
  });

  it('o lembrete exatamente agora também já passou', () => {
    expect(planReminders([game('g1')], [120], startsAt - 120 * MIN)).toEqual([]);
  });

  it('vários jogos e lembretes: ordenados por hora, sem repetidos', () => {
    const plan = planReminders(
      [game('tarde', '2030-01-11T21:00:00.000Z'), game('cedo')],
      [30, 120, 30],
      startsAt - 24 * 60 * MIN,
    );
    expect(plan.map((r) => `${r.gameId}-${r.minutesBefore}`)).toEqual([
      'cedo-120',
      'cedo-30',
      'tarde-120',
      'tarde-30',
    ]);
  });

  it('jogo que mudou de hora: o plano segue a hora nova', () => {
    const now = startsAt - 10 * 60 * MIN;
    const before = planReminders([game('g1')], [120], now);
    const after = planReminders([game('g1', '2030-01-10T22:00:00.000Z')], [120], now);
    expect(after[0]!.at - before[0]!.at).toBe(60 * MIN);
  });

  it('sem lembretes escolhidos ou com data inválida: nada', () => {
    expect(planReminders([game('g1')], [], 0)).toEqual([]);
    expect(planReminders([game('g1', 'não é data')], [120], 0)).toEqual([]);
  });
});
