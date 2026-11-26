import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Venue } from '@convocados/db';
import dataSource from '../data-source.js';
import {
  buildVenueQuery,
  toVenues,
  type OverpassResponse,
} from '../venues/osm-venues.js';
import { fetchOverpass } from '../venues/overpass.js';

/**
 * Importa locais do OpenStreetMap para a tabela "venues".
 *
 *   pnpm --filter api venues:import                      (Lourosa/Fiães, 10 km)
 *   pnpm --filter api venues:import -- --lat 40.946 --lng -8.470 --radius-km 5
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
  console.error((err as Error).message);
  process.exit(1);
});
