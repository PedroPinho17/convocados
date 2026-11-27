import { describe, expect, it } from 'vitest';
import {
  balanceTeams,
  bayesianStrength,
  teamsBalanceSummary,
  type PlayerSkill,
} from '../index';

const players = (...skills: number[]): PlayerSkill[] =>
  skills.map((skill, i) => ({ userId: String(i), name: `J${i}`, skill }));

const sizes = (skills: number[], teamCount = 2) =>
  balanceTeams(players(...skills), { teamCount }).map((t) => t.players.length);

describe('bayesianStrength', () => {
  it('sem avaliações devolve o prior', () => {
    expect(bayesianStrength(0, 0, 3.2)).toBe(3.2);
  });

  it('com poucas avaliações puxa para o prior (C=3)', () => {
    // (5 + 3*3) / (1+3) = 14/4 = 3.5
    expect(bayesianStrength(5, 1, 3)).toBe(3.5);
  });
});

describe('balanceTeams', () => {
  it('exige pelo menos 2 equipas e jogadores suficientes', () => {
    expect(() => balanceTeams(players(3), { teamCount: 2 })).toThrow();
    expect(() => balanceTeams(players(3, 3), { teamCount: 1 })).toThrow();
  });

  it('dá nomes A, B, C, D', () => {
    expect(
      balanceTeams(players(3, 3, 3, 3), { teamCount: 4 }).map((t) => t.name),
    ).toEqual(['A', 'B', 'C', 'D']);
  });

  it('distribui os mais fortes pelas duas equipas', () => {
    const teams = balanceTeams(players(5, 5, 1, 1));
    for (const t of teams) {
      expect(t.players.map((p) => p.skill).sort()).toEqual([1, 5]);
    }
  });

  it('equipas com o mesmo número de jogadores, mesmo com um jogador muito mais forte', () => {
    const skills = [5, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    expect(sizes(skills)).toEqual([5, 5]);
    const totals = balanceTeams(players(...skills)).map((t) => t.totalSkill);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(4);
  });

  it('número ímpar: no máximo 1 jogador de diferença', () => {
    expect(sizes([5, 4, 3]).sort()).toEqual([1, 2]);
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

  it('é determinista sem semente', () => {
    const input = players(4, 3.5, 3, 3, 2.5, 2, 4.5, 1);
    expect(balanceTeams(input)).toEqual(balanceTeams([...input].reverse()));
  });

  it('a mesma semente é reprodutível; sementes diferentes podem mudar o draft', () => {
    const input = players(4, 4, 3, 3, 3, 2, 2, 2);
    expect(balanceTeams(input, { seed: 42 })).toEqual(
      balanceTeams(input, { seed: 42 }),
    );
    const a = balanceTeams(input, { seed: 1 })
      .map((t) => t.players.map((p) => p.userId).join(','))
      .join('|');
    const b = balanceTeams(input, { seed: 99 })
      .map((t) => t.players.map((p) => p.userId).join(','))
      .join('|');
    // Com skills iguais, sementes diferentes devem poder alterar a composição.
    expect(a === b || a !== b).toBe(true);
    expect(balanceTeams(input, { seed: 1 })).not.toEqual(
      balanceTeams(input, { seed: 99 }),
    );
  });

  it('sem avaliações distintas (tudo 3): ainda equilibra tamanhos', () => {
    const teams = balanceTeams(players(3, 3, 3, 3, 3));
    expect(teams.map((t) => t.players.length).sort()).toEqual([2, 3]);
    expect(teamsBalanceSummary(teams).difference).toBeLessThanOrEqual(3);
  });

  it('separa guarda-redes quando há dois GR (soft)', () => {
    const input: PlayerSkill[] = [
      { userId: 'gk1', name: 'GR1', skill: 3, preferredPosition: 'GK' },
      { userId: 'gk2', name: 'GR2', skill: 3, preferredPosition: 'GK' },
      { userId: 'a', name: 'A', skill: 3, preferredPosition: 'DEF' },
      { userId: 'b', name: 'B', skill: 3, preferredPosition: 'MID' },
      { userId: 'c', name: 'C', skill: 3, preferredPosition: 'FWD' },
      { userId: 'd', name: 'D', skill: 3, preferredPosition: 'ANY' },
    ];
    const teams = balanceTeams(input);
    const gkPerTeam = teams.map(
      (t) => t.players.filter((p) => p.preferredPosition === 'GK').length,
    );
    expect(Math.max(...gkPerTeam)).toBe(1);
  });

  it('teamsBalanceSummary formata em pt-PT', () => {
    const summary = teamsBalanceSummary([
      { totalSkill: 10.2 },
      { totalSkill: 9.8 },
    ]);
    expect(summary.difference).toBe(0.4);
    expect(summary.explanation).toBe('Diferença de 0,4 pontos');
  });
});
