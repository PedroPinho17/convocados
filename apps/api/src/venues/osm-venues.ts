/**
 * OpenStreetMap → locais do Convocados. Tudo aqui é puro (sem rede nem base de dados),
 * para se testar com respostas do Overpass guardadas.
 *
 * Regras:
 * - Um campo (leisure=pitch) dentro de um complexo ou estádio com contorno no OSM
 *   junta-se a esse complexo: para marcar um jogo escolhe-se o complexo, e muitos
 *   campos não têm nome. Fica o maior complexo que o contém.
 * - O que, depois de juntar, continua sem nome, fica de fora (pode ser acrescentado
 *   à mão pelos utilizadores).
 * - Fica de fora o que só tem desportos que a app não tem (natação, atletismo, ginásio...).
 */

export type LatLng = { lat: number; lon: number };

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: LatLng;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  geometry?: LatLng[];
  members?: { type: string; role: string; geometry?: LatLng[] }[];
  tags?: Record<string, string>;
};

export type OverpassResponse = { elements: OverpassElement[] };

export type VenueInput = {
  osmId: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  sports: string[];
  surface: string | null;
};

export type ImportStats = {
  /** Elementos recebidos do Overpass. */
  elements: number;
  /** Locais que ficam (um por complexo / campo isolado com nome). */
  venues: number;
  /** Campos e pavilhões juntados ao complexo onde estão. */
  mergedIntoComplex: number;
  /** Ficaram sem nome mesmo depois de juntar. */
  skippedUnnamed: number;
  /** Só têm desportos que a app não tem (natação, atletismo...). */
  skippedOtherSports: number;
};

export type Area = { lat: number; lng: number; radiusKm: number };

export const MAX_RADIUS_KM = 50;

/**
 * Uma única consulta, leve: campos e pavilhões trazem o centro; complexos e estádios
 * trazem o retângulo que os envolve ("out bb"), que chega para ver que campos contêm.
 */
export function buildVenueQuery({ lat, lng, radiusKm }: Area): string {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    throw new Error('Latitude inválida.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    throw new Error('Longitude inválida.');
  if (!(radiusKm > 0 && radiusKm <= MAX_RADIUS_KM)) {
    throw new Error(`O raio tem de estar entre 0 e ${MAX_RADIUS_KM} km.`);
  }
  const around = `around:${Math.round(radiusKm * 1000)},${lat.toFixed(5)},${lng.toFixed(5)}`;
  return `[out:json][timeout:50];
(
  nwr(${around})["leisure"="pitch"]["sport"~"soccer|futsal|multi|padel|tennis|basketball|volleyball"];
)->.pitches;
(
  nwr(${around})["leisure"="sports_hall"];
)->.halls;
(
  nwr(${around})["leisure"~"^(sports_centre|stadium)$"];
)->.complexes;
.pitches out center tags;
.halls out center tags;
.complexes out bb tags;`;
}

/** Desportos da app (etiquetas sport do OSM): ver SPORTS no shared. */
const SUPPORTED = new Set([
  'soccer',
  'futsal',
  'multi',
  'padel',
  'tennis',
  'basketball',
  'volleyball',
]);
const SPORT_ALIASES: Record<string, string> = {
  futebol: 'soccer',
  andebol: 'handball',
  basquetebol: 'basketball',
  voleibol: 'volleyball',
};
/** Sem etiqueta sport, decide-se pelo nome. */
const SPORT_NAME =
  /campo|est[áa]dio|polidesportivo|pavilh|futebol|futsal|gimnodesportivo|complexo desportivo|parque de jogos|padel|t[ée]nis|basquet|volei/i;
const OTHER_SPORT_NAME = /piscina|gin[áa]sio|atletismo/i;

export function normalizeSports(raw: string | undefined): string[] {
  if (!raw) return [];
  const list = raw
    .split(';')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => SPORT_ALIASES[s] ?? s);
  return [...new Set(list)].sort();
}

type Item = {
  el: OverpassElement;
  osmId: string;
  leisure: string;
  name: string | null;
  sports: string[];
  surface: string | null;
  center: LatLng;
  rings: LatLng[][];
  area: number;
};

function centerOf(el: OverpassElement): LatLng | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  if (el.bounds) {
    return {
      lat: (el.bounds.minlat + el.bounds.maxlat) / 2,
      lon: (el.bounds.minlon + el.bounds.maxlon) / 2,
    };
  }
  const pts = el.geometry ?? el.members?.flatMap((m) => m.geometry ?? []) ?? [];
  if (pts.length === 0) return null;
  // Centro do retângulo que envolve o contorno (como os "bounds" do Overpass).
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
}

const closed = (ring: LatLng[]) =>
  ring.length >= 4 &&
  ring[0]!.lat === ring[ring.length - 1]!.lat &&
  ring[0]!.lon === ring[ring.length - 1]!.lon;

/** Contornos: o da via fechada, ou os anéis exteriores de uma relação (multipolígono). */
function ringsOf(el: OverpassElement): LatLng[][] {
  if (el.type === 'way' && el.geometry && closed(el.geometry))
    return [el.geometry];
  if (el.type === 'relation' && el.members) {
    const outers = el.members.filter((m) => m.role === 'outer' && m.geometry);
    const whole = outers.map((m) => m.geometry!).filter(closed);
    if (whole.length > 0) return whole;
    // Anel partido em várias vias: junta-se tudo (chega para "está cá dentro?").
    const joined = outers.flatMap((m) => m.geometry!);
    if (joined.length >= 3) return [[...joined, joined[0]!]];
  }
  // Sem contorno, mas com o retângulo que o envolve ("out bb"): chega para "está cá dentro?".
  if (el.type !== 'node' && el.bounds) {
    const { minlat, minlon, maxlat, maxlon } = el.bounds;
    return [
      [
        { lat: minlat, lon: minlon },
        { lat: minlat, lon: maxlon },
        { lat: maxlat, lon: maxlon },
        { lat: maxlat, lon: minlon },
        { lat: minlat, lon: minlon },
      ],
    ];
  }
  return [];
}

/** Área aproximada (graus²): só serve para comparar tamanhos. */
function ringArea(ring: LatLng[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j]!.lon + ring[i]!.lon) * (ring[j]!.lat - ring[i]!.lat);
  }
  return Math.abs(sum / 2);
}

/** Ray casting: o ponto está dentro do anel? */
export function insideRing(p: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.lat > p.lat !== b.lat > p.lat) {
      const x = ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon;
      if (p.lon < x) inside = !inside;
    }
  }
  return inside;
}

function toItem(el: OverpassElement): Item | null {
  const tags = el.tags ?? {};
  const center = centerOf(el);
  if (!center || !tags.leisure) return null;
  const rings = ringsOf(el);
  return {
    el,
    osmId: `${el.type}/${el.id}`,
    leisure: tags.leisure,
    name: tags.name?.trim() || null,
    sports: normalizeSports(tags.sport),
    surface: tags.surface?.trim() || null,
    center,
    rings,
    area: rings.reduce((s, r) => s + ringArea(r), 0),
  };
}

function addressOf(tags: Record<string, string>): {
  address: string | null;
  city: string | null;
} {
  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(', ');
  const address = [street, tags['addr:postcode']].filter(Boolean).join(', ');
  const city =
    tags['addr:city'] ?? tags['addr:place'] ?? tags['addr:suburb'] ?? null;
  return { address: address || null, city: city?.trim() || null };
}

function isSupported(root: Item, sports: string[], name: string): boolean {
  if (sports.some((s) => SUPPORTED.has(s))) return true;
  if (sports.length > 0) return false; // só desportos que a app não tem
  if (OTHER_SPORT_NAME.test(name)) return false;
  return (
    root.leisure === 'stadium' ||
    root.leisure === 'sports_hall' ||
    SPORT_NAME.test(name)
  );
}

export function toVenues(data: OverpassResponse): {
  venues: VenueInput[];
  stats: ImportStats;
} {
  const items = data.elements.map(toItem).filter((i): i is Item => i !== null);
  const containers = items.filter(
    (i) =>
      (i.leisure === 'sports_centre' || i.leisure === 'stadium') &&
      i.rings.length > 0,
  );

  // Cada item junta-se ao MAIOR complexo/estádio que o contém (maior do que ele próprio).
  const parent = new Map<Item, Item>();
  for (const item of items) {
    let best: Item | undefined;
    for (const c of containers) {
      if (c === item || c.area <= item.area) continue;
      if (!c.rings.some((r) => insideRing(item.center, r))) continue;
      if (!best || c.area > best.area) best = c;
    }
    if (best) parent.set(item, best);
  }
  const rootOf = (i: Item): Item => {
    let r = i;
    const seen = new Set<Item>();
    while (parent.has(r) && !seen.has(r)) {
      seen.add(r);
      r = parent.get(r)!;
    }
    return r;
  };

  const groups = new Map<Item, Item[]>();
  for (const item of items) {
    const root = rootOf(item);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  }

  const stats: ImportStats = {
    elements: data.elements.length,
    venues: 0,
    mergedIntoComplex: items.length - groups.size,
    skippedUnnamed: 0,
    skippedOtherSports: 0,
  };
  const venues: VenueInput[] = [];
  for (const [root, members] of groups) {
    const children = members
      .filter((m) => m !== root)
      .sort((a, b) => b.area - a.area);
    const name = root.name ?? children.find((c) => c.name)?.name ?? null;
    if (!name) {
      stats.skippedUnnamed++;
      continue;
    }
    const sports = [...new Set(members.flatMap((m) => m.sports))].sort();
    if (!isSupported(root, sports, name)) {
      stats.skippedOtherSports++;
      continue;
    }
    const withAddress = [root, ...children].map((m) =>
      addressOf(m.el.tags ?? {}),
    );
    venues.push({
      osmId: root.osmId,
      name: name.slice(0, 200),
      address: withAddress.find((a) => a.address)?.address ?? null,
      city: withAddress.find((a) => a.city)?.city ?? null,
      lat: root.center.lat,
      lng: root.center.lon,
      sports,
      surface:
        root.surface ??
        children.find((c) => c.leisure === 'pitch' && c.surface)?.surface ??
        null,
    });
  }
  stats.venues = venues.length;
  venues.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  return { venues, stats };
}
