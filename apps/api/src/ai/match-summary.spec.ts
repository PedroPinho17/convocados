import { describe, expect, it } from 'vitest';
import {
  buildMatchSummaryUserPrompt,
  cleanMatchSummary,
} from './match-summary.js';

describe('match-summary', () => {
  it('monta o prompt com resultado e jogadores', () => {
    const prompt = buildMatchSummaryUserPrompt({
      title: 'Futebolada',
      sport: 'football',
      location: 'Pavilhão',
      scoreA: 3,
      scoreB: 1,
      teamA: [{ name: 'Rui', avgRating: 4.5 }],
      teamB: [{ name: 'Tó', avgRating: null }],
    });
    expect(prompt).toContain('3–1');
    expect(prompt).toContain('Rui (nota 4.5)');
    expect(prompt).toContain('Tó');
  });

  it('limpa aspas e corta textos longos', () => {
    expect(cleanMatchSummary('"Olá mundo"')).toBe('Olá mundo');
    const long = Array.from({ length: 100 }, () => 'golaço').join(' ');
    const cleaned = cleanMatchSummary(long);
    expect(cleaned.split(/\s+/).length).toBeLessThanOrEqual(81);
  });
});
