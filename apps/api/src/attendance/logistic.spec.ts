import { describe, expect, it } from 'vitest';
import { predictProba, sigmoid, trainLogistic, type Sample } from './logistic.js';

describe('logistic regression', () => {
  it('sigmoid está em (0,1)', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(100)).toBe(1);
    expect(sigmoid(-100)).toBe(0);
  });

  it('treina e converge: feature alta → maior probabilidade', () => {
    const samples: Sample[] = [];
    for (let i = 0; i < 40; i++) {
      samples.push({ x: [0.1], y: 0 });
      samples.push({ x: [0.9], y: 1 });
    }
    const w = trainLogistic(samples, { epochs: 500, lr: 0.3 });
    const low = predictProba(w, [0.1]);
    const high = predictProba(w, [0.9]);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThanOrEqual(1);
    expect(high).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
  });

  it('predições sempre em [0,1]', () => {
    const w = trainLogistic(
      [
        { x: [0, 0, 0, 0, 0], y: 0 },
        { x: [1, 1, 1, 1, 1], y: 1 },
      ],
      { epochs: 200 },
    );
    for (const x of [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0.5, 0.2, 0.8, 0.1, 0.3],
    ]) {
      const p = predictProba(w, x);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
