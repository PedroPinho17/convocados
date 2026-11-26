import {
  buildVenueQuery,
  insideRing,
  normalizeSports,
  toVenues,
  type LatLng,
  type OverpassElement,
} from './osm-venues.js';

/** Quadrado fechado com centro (lat, lon) e meio-lado d (em graus). */
const square = (lat: number, lon: number, d: number): LatLng[] => [
  { lat: lat - d, lon: lon - d },
  { lat: lat - d, lon: lon + d },
  { lat: lat + d, lon: lon + d },
  { lat: lat + d, lon: lon - d },
  { lat: lat - d, lon: lon - d },
];

const way = (
  id: number,
  tags: Record<string, string>,
  geometry?: LatLng[],
  center?: LatLng,
): OverpassElement => ({ type: 'way', id, tags, geometry, center });

const pitch = (
  id: number,
  lat: number,
  lon: number,
  tags: Record<string, string> = {},
) =>
  way(id, { leisure: 'pitch', sport: 'soccer', ...tags }, undefined, {
    lat,
    lon,
  });

describe('buildVenueQuery', () => {
  it('um só pedido: campos com o centro e complexos com o contorno', () => {
    const q = buildVenueQuery({ lat: 40.975, lng: -8.515, radiusKm: 10 });
    expect(q).toContain('around:10000,40.97500,-8.51500');
    expect(q).toContain('.pitches out center tags;');
    expect(q).toContain('.halls out center tags;');
    expect(q).toContain('.complexes out bb tags;');
  });

  it('recusa coordenadas e raios inválidos', () => {
    expect(() => buildVenueQuery({ lat: 91, lng: 0, radiusKm: 5 })).toThrow();
    expect(() => buildVenueQuery({ lat: 40, lng: -8, radiusKm: 0 })).toThrow();
    expect(() => buildVenueQuery({ lat: 40, lng: -8, radiusKm: 51 })).toThrow();
  });
});

describe('normalizeSports', () => {
  it('separa por ";", passa a minúsculas e traduz os nomes portugueses', () => {
    expect(normalizeSports('Futebol;padel')).toEqual(['padel', 'soccer']);
    expect(normalizeSports('andebol; futsal;futsal')).toEqual([
      'futsal',
      'handball',
    ]);
    expect(normalizeSports(undefined)).toEqual([]);
  });
});

describe('insideRing', () => {
  it('dentro e fora de um quadrado', () => {
    const ring = square(40, -8, 0.01);
    expect(insideRing({ lat: 40, lon: -8 }, ring)).toBe(true);
    expect(insideRing({ lat: 40.02, lon: -8 }, ring)).toBe(false);
  });
});

describe('toVenues', () => {
  it('campos dentro de um complexo juntam-se a ele (com e sem nome)', () => {
    const { venues, stats } = toVenues({
      elements: [
        way(
          1,
          {
            leisure: 'sports_centre',
            name: 'Complexo do Feirense',
            'addr:city': 'Sanfins',
          },
          square(40.93, -8.52, 0.002),
        ),
        pitch(2, 40.9301, -8.5201, { surface: 'grass' }),
        pitch(3, 40.9299, -8.5199, {
          sport: 'futsal',
          name: 'Campo de Treinos',
        }),
      ],
    });
    expect(stats.mergedIntoComplex).toBe(2);
    expect(venues).toEqual([
      {
        osmId: 'way/1',
        name: 'Complexo do Feirense',
        address: null,
        city: 'Sanfins',
        lat: 40.93,
        lng: -8.52,
        sports: ['futsal', 'soccer'],
        surface: 'grass',
      },
    ]);
  });

  it('complexo sem nome fica com o nome do maior campo com nome', () => {
    const { venues } = toVenues({
      elements: [
        way(10, { leisure: 'sports_centre' }, square(41.01, -8.44, 0.003)),
        way(
          11,
          { leisure: 'pitch', sport: 'soccer', name: 'Canedo FC' },
          square(41.01, -8.44, 0.001),
        ),
      ],
    });
    expect(venues.map((v) => [v.osmId, v.name])).toEqual([
      ['way/10', 'Canedo FC'],
    ]);
  });

  it('estádio dentro de um complexo: fica só o complexo (o maior)', () => {
    const { venues, stats } = toVenues({
      elements: [
        way(
          20,
          { leisure: 'sports_centre', name: 'Estádio da Lusitânia' },
          square(40.988, -8.543, 0.004),
        ),
        way(
          21,
          { leisure: 'stadium', name: 'Estádio do Lusitânia de Lourosa' },
          square(40.988, -8.543, 0.002),
        ),
        pitch(22, 40.988, -8.543),
      ],
    });
    expect(venues.map((v) => v.name)).toEqual(['Estádio da Lusitânia']);
    expect(stats.mergedIntoComplex).toBe(2);
  });

  it('campo sozinho: fica se tiver nome; sem nome fica de fora', () => {
    const { venues, stats } = toVenues({
      elements: [
        pitch(30, 40.946, -8.47, { name: 'Romariz Futebol Clube' }),
        pitch(31, 40.95, -8.48),
      ],
    });
    expect(venues.map((v) => v.name)).toEqual(['Romariz Futebol Clube']);
    expect(stats.skippedUnnamed).toBe(1);
  });

  it('padel, ténis, basquetebol e voleibol ficam; natação e ginásios ficam de fora', () => {
    const { venues, stats } = toVenues({
      elements: [
        way(
          40,
          {
            leisure: 'sports_centre',
            sport: 'swimming',
            name: 'Piscinas de Lourosa',
          },
          square(40.98, -8.54, 0.001),
        ),
        {
          type: 'node',
          id: 41,
          lat: 40.93,
          lon: -8.5,
          tags: {
            leisure: 'sports_centre',
            sport: 'padel',
            name: 'Padel Plus',
          },
        },
        way(
          42,
          { leisure: 'sports_hall', name: 'Pavilhão Municipal' },
          square(40.996, -8.531, 0.0005),
        ),
        way(
          43,
          {
            leisure: 'sports_centre',
            name: 'HMC Sports - Piscinas e Ginásios',
          },
          square(40.92, -8.545, 0.001),
        ),
        way(
          44,
          { leisure: 'sports_centre', name: 'Complexo Desportivo de Cassufas' },
          square(41.004, -8.603, 0.001),
        ),
      ],
    });
    expect(venues.map((v) => v.name)).toEqual([
      'Complexo Desportivo de Cassufas',
      'Padel Plus',
      'Pavilhão Municipal',
    ]);
    expect(stats.skippedOtherSports).toBe(2);
  });

  it('complexo de padel com um campo de futebol lá dentro: fica com os dois desportos', () => {
    const { venues } = toVenues({
      elements: [
        way(
          50,
          { leisure: 'sports_centre', sport: 'padel', name: 'Moove' },
          square(40.926, -8.54, 0.002),
        ),
        pitch(51, 40.926, -8.54, { surface: 'artificial_turf' }),
      ],
    });
    expect(venues).toMatchObject([
      {
        name: 'Moove',
        sports: ['padel', 'soccer'],
        surface: 'artificial_turf',
      },
    ]);
  });

  it('relação (multipolígono) também contém campos', () => {
    const { venues } = toVenues({
      elements: [
        {
          type: 'relation',
          id: 60,
          tags: { leisure: 'stadium', name: 'Estádio Municipal' },
          members: [
            {
              type: 'way',
              role: 'outer',
              geometry: square(41.03, -8.57, 0.002),
            },
          ],
        },
        pitch(61, 41.03, -8.57, { name: 'Relvado principal' }),
      ],
    });
    expect(venues.map((v) => v.osmId)).toEqual(['relation/60']);
  });

  it('morada: rua, número e código postal; cidade do addr:city', () => {
    const { venues } = toVenues({
      elements: [
        way(
          70,
          {
            leisure: 'sports_hall',
            name: 'Pavilhão de Fiães',
            'addr:street': 'Rua Casa do Povo',
            'addr:housenumber': '18',
            'addr:postcode': '4505-000',
            'addr:city': 'Fiães',
          },
          square(40.985, -8.52, 0.0005),
        ),
      ],
    });
    expect(venues[0]).toMatchObject({
      address: 'Rua Casa do Povo, 18, 4505-000',
      city: 'Fiães',
    });
  });
});

describe('toVenues com retângulos (out bb)', () => {
  it('um campo dentro do retângulo de um complexo junta-se a ele', () => {
    const { venues } = toVenues({
      elements: [
        {
          type: 'way',
          id: 90,
          tags: { leisure: 'sports_centre', name: 'Complexo do Ervedal' },
          bounds: {
            minlat: 40.953,
            minlon: -8.556,
            maxlat: 40.956,
            maxlon: -8.553,
          },
        },
        pitch(91, 40.9545, -8.5547, { surface: 'artificial_turf' }),
      ],
    });
    expect(venues).toMatchObject([
      {
        osmId: 'way/90',
        name: 'Complexo do Ervedal',
        sports: ['soccer'],
        surface: 'artificial_turf',
      },
    ]);
  });
});
