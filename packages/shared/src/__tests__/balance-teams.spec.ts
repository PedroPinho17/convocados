import { describe, expect, it } from 'vitest';
import { balanceTeams, type PlayerSkill } from '../index';

const players = (...skills: number[]): PlayerSkill[] =>
  skills.map((skill, i) => ({ userId: String(i), name: `J${i}`, skill }));

const sizes = (skills: number[], teamCount = 2) =>
  balanceTeams(players(...skills), teamCount).map((t) => t.players.length);

describe('balanceTeams', () => {
  it('exige pelo menos 2 equipas e jogadores suficientes', () => {
    expect(() => balanceTeams(players(3), 2)).toThrow();
    expect(() => balanceTeams(players(3, 3), 1)).toThrow();
  });

  it('dá nomes A, B, C, D', () => {
    expect(balanceTeams(players(3, 3, 3, 3), 4).map((t) => t.name)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('distribui os mais fortes pelas duas equipas', () => {
    const teams = balanceTeams(players(5, 5, 1, 1));
    for (const t of teams) {
      expect(t.players.map((p) => p.skill).sort()).toEqual([1, 5]);
    }
  });

  it('equipas com o mesmo número de jogadores, mesmo com um jogador muito mais forte', () => {
    // Sem limite de tamanho, isto dava 3 contra 7.
    const skills = [5, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    expect(sizes(skills)).toEqual([5, 5]);
    const totals = balanceTeams(players(...skills)).map((t) => t.totalSkill);
    expect(totals.sort((a, b) => a - b)).toEqual([5, 9]); // o melhor possível com 5 contra 5
  });

  it('número ímpar: no máximo 1 jogador de diferença', () => {
    expect(sizes([5, 4, 3])).toEqual([1, 2]);
    expect(sizes([5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).sort()).toEqual([5, 6]);
  });

  it('com 3 ou 4 equipas, os tamanhos diferem no máximo em 1', () => {
    for (let n = 3; n <= 16; n++) {
      for (const count of [3, 4]) {
        if (n < count) continue;
        const s = sizes(
          Array.from({ length: n }, (_, i) => (i === 0 ? 5 : 1 + (i % 3))),
          count,
        );
        expect(s.reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('é determinista: os mesmos jogadores dão sempre as mesmas equipas', () => {
    const input = players(4, 3.5, 3, 3, 2.5, 2, 4.5, 1);
    expect(balanceTeams(input)).toEqual(balanceTeams([...input].reverse()));
  });
});
