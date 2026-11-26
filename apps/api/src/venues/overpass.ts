import type { OverpassResponse } from './osm-venues.js';

/** Instância pública por defeito; pode trocar-se por outra (ex.: https://overpass.kumi.systems/api/interpreter). */
export const OVERPASS_URL =
  process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

/**
 * Regras de uso do Overpass (servidor público e gratuito):
 * - um pedido por importação, nunca em ciclo;
 * - um User-Agent que identifica a app;
 * - se o servidor disser que está ocupado (429/504), não se insiste: tenta-se mais tarde.
 */
export const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT ??
  'Convocados/1.0 (venue import; +https://github.com/PedroPinho17/convocados)';

export async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': OVERPASS_USER_AGENT,
      Accept: 'application/json',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(120_000),
  });
  if (res.status === 429 || res.status === 504) {
    throw new Error(
      `O Overpass está ocupado (${res.status}). Tenta outra vez daqui a uns minutos.`,
    );
  }
  if (!res.ok) throw new Error(`O Overpass respondeu ${res.status}.`);
  const data = (await res.json()) as Partial<OverpassResponse>;
  if (!Array.isArray(data.elements))
    throw new Error('Resposta do Overpass sem "elements".');
  return { elements: data.elements };
}
