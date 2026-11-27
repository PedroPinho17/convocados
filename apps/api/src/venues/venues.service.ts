import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  SPORTS,
  foldText,
  type VenueDto,
  type CreateVenueInput,
  type VenueSearchQuery,
} from '@convocados/shared';

/** Acentos → letras simples, igual ao foldText do shared (para comparar no Postgres). */
const ACCENTED = 'áàâãäåéèêëíìîïóòôõöúùûüçñ';
const PLAIN = 'aaaaaaeeeeiiiiooooouuuucn';
const folded = (col: string) =>
  `translate(lower(${col}), '${ACCENTED}', '${PLAIN}')`;

type Row = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  sports: string[];
  distanceKm: number | null;
};

/**
 * Pesquisa de campos na tabela "venues" (importada do OpenStreetMap ou acrescentada por
 * utilizadores). Nunca chama o Overpass: a importação é feita à parte (venues:import).
 */
@Injectable()
export class VenuesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async search(input: VenueSearchQuery): Promise<VenueDto[]> {
    const params: unknown[] = [];
    const add = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const where: string[] = [];

    const q = input.q ? foldText(input.q).trim() : '';
    if (q) {
      // Cada palavra tem de aparecer no nome, na localidade ou na morada.
      for (const word of q.split(/\s+/).slice(0, 5)) {
        const p = add(`%${word.replace(/[%_\\]/g, '')}%`);
        where.push(
          `(${folded('"name"')} LIKE ${p} OR ${folded(`coalesce("city", '')`)} LIKE ${p} OR ${folded(`coalesce("address", '')`)} LIKE ${p})`,
        );
      }
    }

    if (input.sport && input.sport !== 'other') {
      const tags = [...SPORTS[input.sport].osm];
      // Campos sem desporto conhecido (muitos pavilhões) também servem.
      where.push(
        `("sports" && ${add(tags)}::text[] OR cardinality("sports") = 0)`,
      );
    }

    let distance = 'NULL::double precision';
    const hasPoint = input.lat !== undefined && input.lng !== undefined;
    if (hasPoint) {
      const lat = add(input.lat);
      const lng = add(input.lng);
      const radius = input.radiusKm ?? 15;
      // Retângulo primeiro (usa o índice lat/lng), distância exata (haversine) depois.
      const dLat = radius / 111;
      const dLng =
        radius /
        (111 *
          Math.max(0.1, Math.cos(((input.lat as number) * Math.PI) / 180)));
      where.push(
        `"lat" BETWEEN ${lat} - ${add(dLat)} AND ${lat} + ${add(dLat)}`,
      );
      where.push(
        `"lng" BETWEEN ${lng} - ${add(dLng)} AND ${lng} + ${add(dLng)}`,
      );
      distance = `2 * 6371 * asin(sqrt(
        power(sin(radians("lat" - ${lat}) / 2), 2) +
        cos(radians(${lat})) * cos(radians("lat")) * power(sin(radians("lng" - ${lng}) / 2), 2)
      ))`;
      where.push(`${distance} <= ${add(radius)}`);
    }

    const limit = add(input.limit ?? 12);
    const rows: Row[] = await this.dataSource.query(
      `SELECT "id", "name", "address", "city", "lat", "lng", "sports", ${distance} AS "distanceKm"
       FROM "venues"
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${hasPoint ? '"distanceKm" ASC,' : ''} "name" ASC
       LIMIT ${limit}`,
      params,
    );
    return rows.map(toDto);
  }

  /**
   * Um campo escrito à mão, para aparecer nas sugestões da próxima vez. Se já existe um com
   * o mesmo nome e localidade (sem acentos nem maiúsculas), devolve esse em vez de duplicar.
   */
  async create(userId: string, input: CreateVenueInput): Promise<VenueDto> {
    const name = input.name.replace(/\s+/g, ' ').trim();
    const city = input.city?.replace(/\s+/g, ' ').trim() || null;

    const existing: Row[] = await this.dataSource.query(
      `SELECT "id", "name", "address", "city", "lat", "lng", "sports", NULL::double precision AS "distanceKm"
       FROM "venues"
       WHERE ${folded('"name"')} = $1 AND ${folded(`coalesce("city", '')`)} = $2
       LIMIT 1`,
      [foldText(name), foldText(city ?? '')],
    );
    if (existing[0]) return toDto(existing[0]);

    const sports = input.sport && input.sport !== 'other' ? [SPORTS[input.sport].osm[0]] : [];
    const created: Row[] = await this.dataSource.query(
      `INSERT INTO "venues" ("name", "city", "source", "sports", "createdById")
       VALUES ($1, $2, 'user', $3::text[], $4)
       RETURNING "id", "name", "address", "city", "lat", "lng", "sports", NULL::double precision AS "distanceKm"`,
      [name, city, sports, userId],
    );
    return toDto(created[0]);
  }
}

const toDto = (r: Row): VenueDto => ({
  id: r.id,
  name: r.name,
  address: r.address,
  city: r.city,
  lat: r.lat === null ? null : Number(r.lat),
  lng: r.lng === null ? null : Number(r.lng),
  sports: r.sports,
  distanceKm: r.distanceKm === null ? null : Math.round(Number(r.distanceKm) * 10) / 10,
});
