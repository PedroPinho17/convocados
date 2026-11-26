import { describe, expect, it } from 'vitest';
import { shareSummary, sharePerPlayerCents } from '../index';

// Intl põe um espaço inquebrável antes do €; normalizar para comparar.
const text = (s: string) => s.replace(/\s/g, ' ');

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

describe('shareSummary', () => {
  const game = { totalPriceCents: 3000, slots: 10 };

  it('sem confirmados: o valor se as vagas encherem', () => {
    expect(text(shareSummary(game))).toBe('Cada um paga 3,00 € se as 10 vagas encherem.');
  });

  it('com confirmados: o valor agora (só pagam os confirmados) e se encher', () => {
    expect(text(shareSummary(game, 7))).toBe('Com 7 confirmados, cada um paga 4,29 €; se encher, 3,00 €.');
  });

  it('cheio', () => {
    expect(text(shareSummary(game, 10))).toBe('Cada um paga 3,00 € (10 confirmados).');
  });

  it('grátis', () => {
    expect(shareSummary({ totalPriceCents: 0, slots: 10 }, 3)).toBe('Jogo grátis.');
  });
});
