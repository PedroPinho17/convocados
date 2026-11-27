import type { OverpassResponse } from './osm-venues.js';

/**
 * Instâncias públicas do Overpass, por ordem. OVERPASS_URL (se definido) vem primeiro.
 * Uma instância sobrecarregada (502/504/timeout) é comum: tenta-se a seguinte.
 */
export const OVERPASS_URLS = [
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/**
 * Regras de uso do Overpass (servidores públicos e gratuitos):
 * - pedidos um a um, nunca em paralelo, com pausa entre eles;
 * - um User-Agent que identifica a app;
 * - se todas as instâncias falharem, pára: tenta-se mais tarde.
 */
export const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT ??
  'Convocados/1.0 (venue import; +https://github.com/PedroPinho17/convocados)';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchFrom(url: string, query: string): Promise<OverpassResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': OVERPASS_USER_AGENT,
      Accept: 'application/json',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(200_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} respondeu ${res.status}`);
  const data = (await res.json()) as Partial<OverpassResponse> & { remark?: string };
  if (!Array.isArray(data.elements)) throw new Error(`${new URL(url).host}: resposta sem "elements"`);
  // O Overpass devolve 200 com um "remark" quando a consulta passou do tempo: o resultado vem incompleto.
  if (data.remark && /timed out|out of memory/i.test(data.remark)) {
    throw new Error(`${new URL(url).host}: ${data.remark}`);
  }
  return { elements: data.elements };
}

/** Tenta cada instância (até 2 voltas, com pausa crescente) antes de desistir. */
export async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const errors: string[] = [];
  for (let round = 0; round < 2; round++) {
    for (const url of OVERPASS_URLS) {
      try {
        return await fetchFrom(url, query);
      } catch (err) {
        errors.push((err as Error).message);
        await wait(5_000 * (round + 1));
      }
    }
  }
  throw new Error(`O Overpass não respondeu (${errors.join('; ')}). Tenta outra vez mais tarde.`);
}
