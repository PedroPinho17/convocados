import { priceRangeCents, sharePerPlayerCents } from '@convocados/shared';

describe('sharePerPlayerCents', () => {
  it('divide o total pelos jogadores', () => {
    expect(sharePerPlayerCents(3000, 10)).toBe(300);
    expect(sharePerPlayerCents(3000, 12)).toBe(250);
  });

  it('arredonda para cima, para o organizador nunca ficar a perder', () => {
    expect(sharePerPlayerCents(3000, 7)).toBe(429);
    expect(sharePerPlayerCents(3000, 7) * 7).toBeGreaterThanOrEqual(3000);
  });

  it('com 0 jogadores, um paga tudo (nunca divide por zero)', () => {
    expect(sharePerPlayerCents(3000, 0)).toBe(3000);
  });

  it('jogo grátis dá 0', () => {
    expect(sharePerPlayerCents(0, 10)).toBe(0);
  });
});

describe('priceRangeCents', () => {
  it('min com vagas + suplentes, max só com vagas', () => {
    expect(priceRangeCents({ totalPriceCents: 3000, slots: 10, subs: 2 })).toEqual({
      min: 250,
      max: 300,
    });
  });
});
