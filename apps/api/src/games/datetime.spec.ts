import { toLocalDateTimeInput } from '@convocados/shared';

describe('toLocalDateTimeInput', () => {
  it('devolve o formato do <input type="datetime-local">', () => {
    expect(toLocalDateTimeInput('2026-11-27T21:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('volta à mesma hora quando é lido como hora local (qualquer fuso)', () => {
    for (const iso of ['2026-01-15T20:30:00.000Z', '2026-07-15T20:30:00.000Z']) {
      expect(new Date(toLocalDateTimeInput(iso)).toISOString()).toBe(iso);
    }
  });
});
