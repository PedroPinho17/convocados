/**
 * Regressão logística simples (gradiente descendente) em TypeScript puro.
 * Usada para prever comparecimento a partir de features históricas.
 */

export type Sample = { x: number[]; y: 0 | 1 };

export function sigmoid(z: number): number {
  if (z >= 20) return 1;
  if (z <= -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/** Prediz P(y=1 | x) com pesos w (w[0] = bias; x sem bias). */
export function predictProba(weights: number[], x: number[]): number {
  let z = weights[0] ?? 0;
  for (let i = 0; i < x.length; i++) z += (weights[i + 1] ?? 0) * (x[i] ?? 0);
  return sigmoid(z);
}

/**
 * Treina com GD. Devolve pesos [bias, ...].
 * Converge em poucas centenas de iterações com dados tipicamente pequenos.
 */
export function trainLogistic(
  samples: Sample[],
  opts: { lr?: number; epochs?: number; l2?: number } = {},
): number[] {
  const dim = samples[0]?.x.length ?? 0;
  if (samples.length === 0 || dim === 0) return [0];

  const lr = opts.lr ?? 0.2;
  const epochs = opts.epochs ?? 400;
  const l2 = opts.l2 ?? 0.01;
  const w = Array.from({ length: dim + 1 }, () => 0);

  for (let ep = 0; ep < epochs; ep++) {
    const grad = Array.from({ length: dim + 1 }, () => 0);
    for (const s of samples) {
      const p = predictProba(w, s.x);
      const err = p - s.y;
      grad[0]! += err;
      for (let j = 0; j < dim; j++) grad[j + 1]! += err * (s.x[j] ?? 0);
    }
    const n = samples.length;
    for (let j = 0; j < w.length; j++) {
      const reg = j === 0 ? 0 : l2 * w[j]!;
      w[j]! -= (lr * (grad[j]! / n + reg));
    }
  }
  return w;
}
