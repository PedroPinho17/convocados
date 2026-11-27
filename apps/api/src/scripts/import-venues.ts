import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Venue } from '@convocados/db';
import dataSource from '../data-source.js';
import {
  buildPortugalTileQuery,
  buildVenueQuery,
  portugalTiles,
  toVenues,
  type OverpassResponse,
} from '../venues/osm-venues.js';
import { fetchOverpass } from '../venues/overpass.js';

/**
 * Importa locais do OpenStreetMap para a tabela "venues".
 *
 *   pnpm --filter api venues:import                      (Lourosa/Fiães, 10 km)
 *   pnpm --filter api venues:import -- --lat 40.946 --lng -8.470 --radius-km 5
 *   pnpm --filter api venues:import -- --portugal --save pt.json   (Portugal inteiro, ~27 blocos)
 *   pnpm --filter api venues:import -- --save osm.json   (guarda a resposta do Overpass)
 *   pnpm --filter api venues:import -- --file osm.json   (sem rede: usa a resposta guardada)
 *
 * Pode correr várias vezes: grava por osmId (insere ou atualiza), um só pedido ao Overpass
 * por execução, e nunca mexe nos locais acrescentados pelos utilizadores.
 */
const DEFAULTS = { lat: 40.975, lng: -8.515, radiusKm: 10 };
const BATCH = 200;

async function main() {
  const { values } = parseArgs({
    options: {
      lat: { type: 'string' },
      lng: { type: 'string' },
      'radius-km': { type: 'string' },
      file: { type: 'string' },
      save: { type: 'string' },
      portugal: { type: 'boolean' },
    },
  });
  const area = {
    lat: values.lat ? Number(values.lat) : DEFAULTS.lat,
    lng: values.lng ? Number(values.lng) : DEFAULTS.lng,
    radiusKm: values['radius-km']
      ? Number(values['radius-km'])
      : DEFAULTS.radiusKm,
  };

  let data: OverpassResponse;
  if (values.file) {
    data = JSON.parse(readFileSync(values.file, 'utf8')) as OverpassResponse;
    console.log(`A ler ${values.file} (sem pedido ao Overpass).`);
  } else if (values.portugal) {
    // Portugal inteiro, bloco a bloco, um pedido de cada vez.
    const tiles = portugalTiles();
    const seen = new Map<string, OverpassResponse['elements'][number]>();
    // Retomável: com --save, cada bloco concluído fica em <ficheiro>.partial; se o Overpass
    // falhar a meio, correr outra vez continua a partir do bloco que faltava.
    const partialPath = values.save ? `${values.save}.partial` : null;
    const done = new Set<number>();
    if (partialPath && existsSync(partialPath)) {
      const saved = JSON.parse(readFileSync(partialPath, 'utf8')) as {
        done: number[];
        elements: OverpassResponse['elements'];
      };
      saved.done.forEach((i) => done.add(i));
      for (const el of saved.elements) seen.set(`${el.type}/${el.id}`, el);
      console.log(`A retomar: ${done.size}/${tiles.length} blocos já feitos.`);
    }
    for (const [i, tile] of tiles.entries()) {
      if (done.has(i)) continue;
      const res = await fetchOverpass(buildPortugalTileQuery(tile));
      for (const el of res.elements) seen.set(`${el.type}/${el.id}`, el);
      done.add(i);
      if (partialPath) {
        writeFileSync(partialPath, JSON.stringify({ done: [...done], elements: [...seen.values()] }));
      }
      console.log(`Bloco ${i + 1}/${tiles.length}: ${res.elements.length} elementos (total ${seen.size}).`);
      await new Promise((r) => setTimeout(r, 2_000)); // pausa entre pedidos: servidor público
    }
    data = { elements: [...seen.values()] };
    if (partialPath && existsSync(partialPath)) unlinkSync(partialPath);
    if (values.save) {
      writeFileSync(values.save, JSON.stringify(data));
      console.log(`Resposta guardada em ${values.save}.`);
    }
  } else {
    const query = buildVenueQuery(area);
    console.log(
      `Um pedido ao Overpass: raio de ${area.radiusKm} km em ${area.lat}, ${area.lng}…`,
    );
    data = await fetchOverpass(query);
    if (values.save) {
      writeFileSync(values.save, JSON.stringify(data));
      console.log(`Resposta guardada em ${values.save}.`);
    }
  }

  const { venues, stats } = toVenues(data);

  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    const repo = dataSource.getRepository(Venue);
    const before = await repo.countBy({ source: 'osm' });
    for (let i = 0; i < venues.length; i += BATCH) {
      await repo.upsert(
        venues
          .slice(i, i + BATCH)
          .map((v) => ({ ...v, source: 'osm' as const })),
        { conflictPaths: ['osmId'] },
      );
    }
    const after = await repo.countBy({ source: 'osm' });

    console.log(`Elementos do OSM:              ${stats.elements}`);
    console.log(`Juntados ao complexo onde estão: ${stats.mergedIntoComplex}`);
    console.log(`De fora (sem nome):             ${stats.skippedUnnamed}`);
    console.log(`De fora (outros desportos):     ${stats.skippedOtherSports}`);
    console.log(`Locais nesta área:              ${stats.venues}`);
    console.log(
      `Na base de dados (osm):         ${before} → ${after} (${after - before} novos)`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  // Alguns erros do Node (ex.: ECONNREFUSED da base de dados) vêm com a mensagem vazia.
  const e = err as Error & { code?: string };
  console.error(e.message || e.code || String(err));
  process.exit(1);
});
