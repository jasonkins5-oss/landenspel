/**
 * Graven naar de kern. Elk punt graaft één "eenheid"; een perfecte puzzel (7 × 1000 punten)
 * eindigt precies in het middelpunt van de aarde. De aardlagen zijn niet even dik (de korst is
 * maar ~35 km, de mantel bijna 3000 km), dus de eenheden lopen per laag lineair op tussen vaste
 * ankerpunten. Zo kost elke laag ongeveer even veel punten.
 *
 * Alle teksten die de speler ziet zijn Engels.
 */
export const MAX_DEPTH_UNITS = 7000;
export const EARTH_RADIUS_KM = 6371;

/** [eenheden, km], oplopend. */
const ANCHORS: readonly (readonly [number, number])[] = [
  [0, 0],
  [500, 4],
  [1500, 35],
  [3000, 660],
  [4500, 2890],
  [6000, 5150],
  [7000, EARTH_RADIUS_KM],
];

function interpolate(x: number, from: 0 | 1, to: 0 | 1): number {
  const first = ANCHORS[0]!;
  const last = ANCHORS[ANCHORS.length - 1]!;
  if (x <= first[from]) return first[to];
  if (x >= last[from]) return last[to];
  for (let i = 1; i < ANCHORS.length; i++) {
    const a = ANCHORS[i - 1]!;
    const b = ANCHORS[i]!;
    if (x <= b[from]) return a[to] + ((x - a[from]) / (b[from] - a[from])) * (b[to] - a[to]);
  }
  return last[to];
}

export function unitsToKm(units: number): number {
  return interpolate(units, 0, 1);
}

export function kmToUnits(km: number): number {
  return interpolate(km, 1, 0);
}

const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

/** "105 m", "12.3 km", "2,890 km". */
export function formatDepth(km: number): string {
  if (km < 1) return `${nf0.format(km * 1000)} m`;
  if (km < 100) return `${nf1.format(km)} km`;
  return `${nf0.format(km)} km`;
}

export interface Layer {
  id: string;
  name: string;
  /** Bereik in eenheden. */
  from: number;
  to: number;
  description: string;
  /** Pixelpalet voor de textuur, van basiskleur naar accenten. */
  colors: readonly string[];
  /** Tekst op deze laag moet donker zijn (lichte, gloeiende lagen). */
  darkText: boolean;
}

export const LAYERS: readonly Layer[] = [
  {
    id: 'soil',
    name: 'Soil',
    from: 0,
    to: 500,
    description: 'dirt, sand and the first rocks',
    colors: ['#6b3f23', '#7a4a2a', '#5a341d', '#8a5733'],
    darkText: false,
  },
  {
    id: 'crust',
    name: 'Crust',
    from: 500,
    to: 1500,
    description: 'solid rock',
    colors: ['#57524e', '#625d58', '#4a4643', '#77716b'],
    darkText: false,
  },
  {
    id: 'upper-mantle',
    name: 'Upper mantle',
    from: 1500,
    to: 3000,
    description: 'hot, slowly flowing rock',
    colors: ['#5e2a1e', '#6e3324', '#4f2219', '#86412b'],
    darkText: false,
  },
  {
    id: 'lower-mantle',
    name: 'Lower mantle',
    from: 3000,
    to: 4500,
    description: 'rock under crushing pressure',
    colors: ['#7a2416', '#8c2f1e', '#661e13', '#a63d22'],
    darkText: false,
  },
  {
    id: 'outer-core',
    name: 'Outer core',
    from: 4500,
    to: 6000,
    description: 'liquid iron and nickel',
    colors: ['#e0661a', '#c9551a', '#f07a22', '#ff9a3d'],
    darkText: true,
  },
  {
    id: 'inner-core',
    name: 'Inner core',
    from: 6000,
    to: 7000,
    description: 'solid iron, as hot as the surface of the sun',
    colors: ['#ffc21a', '#ffd23f', '#f0a81a', '#ffe98a'],
    darkText: true,
  },
];

export function layerAt(units: number): Layer {
  return LAYERS.find((l) => units < l.to) ?? LAYERS[LAYERS.length - 1]!;
}

/** Weetjes langs de schacht, op echte diepte. */
export const DEPTH_FACTS: readonly { km: number; text: string }[] = [
  { km: 0.105, text: 'deepest metro station: 105 m (Kyiv)' },
  { km: 2.2, text: 'deepest cave ever explored: 2.2 km' },
  { km: 4, text: 'deepest gold mine: 4 km (South Africa)' },
  { km: 12.3, text: 'deepest hole ever drilled: 12.3 km (Kola)' },
  { km: 35, text: 'end of the crust: the Moho boundary' },
  { km: 100, text: 'the rock here is about 1,000 °C' },
  { km: 150, text: 'diamonds form down here' },
  { km: 660, text: 'boundary of the upper and lower mantle' },
  { km: 1500, text: 'pressure: ~600,000 times the surface' },
  { km: 2890, text: 'the mantle ends, liquid iron begins' },
  { km: 4000, text: 'flowing iron makes Earth’s magnetic field' },
  { km: 5150, text: 'the solid inner core begins' },
  { km: EARTH_RADIUS_KM, text: 'the centre: ~5,400 °C, as hot as the sun' },
];

export interface Tier {
  id: string;
  name: string;
  /** Minimale rondescore voor deze tier. */
  min: number;
  quip: string;
  color: string;
  /** Voor het deelraster. */
  emoji: string;
}

/** Tiers per ronde, van diep naar ondiep. */
export const TIERS: readonly Tier[] = [
  {
    id: 'core',
    name: 'Core',
    min: 900,
    quip: 'Practically nobody has been down here.',
    color: '#ffd23f',
    emoji: '🟨',
  },
  {
    id: 'magma',
    name: 'Magma',
    min: 700,
    quip: 'Hot take. Very few dig this deep.',
    color: '#ff8a3d',
    emoji: '🟧',
  },
  {
    id: 'bedrock',
    name: 'Bedrock',
    min: 500,
    quip: 'Now we’re getting somewhere.',
    color: '#ff5c8a',
    emoji: '🟥',
  },
  {
    id: 'clay',
    name: 'Clay',
    min: 300,
    quip: 'A solid, sensible dig.',
    color: '#6fd6ff',
    emoji: '🟦',
  },
  {
    id: 'topsoil',
    name: 'Topsoil',
    min: 1,
    quip: 'A well-trodden answer. Try digging somewhere new.',
    color: '#d9c49a',
    emoji: '🟫',
  },
  {
    id: 'missed',
    name: 'Missed',
    min: 0,
    quip: 'Time ran out. The shovel stayed put.',
    color: '#9fb0c3',
    emoji: '⬛',
  },
];

export function tierFor(points: number): Tier {
  return TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1]!;
}
