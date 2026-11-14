import { MAX_TOTAL_SCORE } from './game';

/**
 * Graven naar de kern. Elk punt graaft één "eenheid"; een perfecte puzzel (7000 punten) eindigt
 * precies in het middelpunt van de aarde. De aardlagen zijn niet even dik (de korst is maar
 * ~35 km, de mantel bijna 3000 km), dus de eenheden lopen per laag lineair op tussen vaste
 * ankerpunten. Zo kost elke laag ongeveer even veel punten en blijft het spannend.
 */
export const MAX_DEPTH_UNITS = MAX_TOTAL_SCORE;
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

const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

/** "105 m", "12,3 km", "2.890 km". */
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
    id: 'bodem',
    name: 'Bodem',
    from: 0,
    to: 500,
    description: 'aarde, zand en de eerste rotsen',
    colors: ['#6b3f23', '#7a4a2a', '#5a341d', '#8a5733'],
    darkText: false,
  },
  {
    id: 'korst',
    name: 'Aardkorst',
    from: 500,
    to: 1500,
    description: 'vast gesteente',
    colors: ['#57524e', '#625d58', '#4a4643', '#77716b'],
    darkText: false,
  },
  {
    id: 'bovenmantel',
    name: 'Bovenmantel',
    from: 1500,
    to: 3000,
    description: 'heet, taai gesteente',
    colors: ['#5e2a1e', '#6e3324', '#4f2219', '#86412b'],
    darkText: false,
  },
  {
    id: 'ondermantel',
    name: 'Ondermantel',
    from: 3000,
    to: 4500,
    description: 'gesteente onder enorme druk',
    colors: ['#7a2416', '#8c2f1e', '#661e13', '#a63d22'],
    darkText: false,
  },
  {
    id: 'buitenkern',
    name: 'Buitenkern',
    from: 4500,
    to: 6000,
    description: 'vloeibaar ijzer en nikkel',
    colors: ['#e0661a', '#c9551a', '#f07a22', '#ff9a3d'],
    darkText: true,
  },
  {
    id: 'binnenkern',
    name: 'Binnenkern',
    from: 6000,
    to: 7000,
    description: 'massief ijzer, zo heet als de zon',
    colors: ['#ffc21a', '#ffd23f', '#f0a81a', '#ffe98a'],
    darkText: true,
  },
];

export function layerAt(units: number): Layer {
  return LAYERS.find((l) => units < l.to) ?? LAYERS[LAYERS.length - 1]!;
}

/** Weetjes langs de schacht, op echte diepte. */
export const DEPTH_FACTS: readonly { km: number; text: string }[] = [
  { km: 0.105, text: 'diepste metrostation: 105 m (Kyiv)' },
  { km: 2.2, text: 'diepste grot ooit verkend: 2,2 km' },
  { km: 4, text: 'diepste goudmijn: 4 km (Zuid-Afrika)' },
  { km: 12.3, text: 'diepste boorgat ooit: 12,3 km (Kola)' },
  { km: 35, text: 'einde van de korst: de Moho-grens' },
  { km: 100, text: 'het gesteente is hier ± 1.000 °C' },
  { km: 150, text: 'hier ontstaan diamanten' },
  { km: 660, text: 'grens tussen boven- en ondermantel' },
  { km: 1500, text: 'druk: ± 600.000 keer die aan de oppervlakte' },
  { km: 2890, text: 'de mantel stopt, vloeibaar ijzer begint' },
  { km: 4000, text: 'stromend ijzer maakt hier het magnetisch veld' },
  { km: 5150, text: 'de vaste binnenkern begint' },
  { km: EARTH_RADIUS_KM, text: 'het middelpunt: ± 5.400 °C, zo heet als de zon' },
];

export interface Tier {
  id: string;
  name: string;
  /** Minimale rondescore voor deze tier. */
  min: number;
  quip: string;
  color: string;
}

/** Tiers per ronde, van hoog naar laag. */
export const TIERS: readonly Tier[] = [
  {
    id: 'kern',
    name: 'Kern',
    min: 950,
    quip: 'Recht naar het hart van de aarde.',
    color: '#ffd23f',
  },
  {
    id: 'magma',
    name: 'Magma',
    min: 800,
    quip: 'Het wordt heet onder je schep!',
    color: '#ff8a3d',
  },
  {
    id: 'rotsblok',
    name: 'Rotsblok',
    min: 600,
    quip: 'Stevig door de steen heen.',
    color: '#ff5c8a',
  },
  { id: 'kiezel', name: 'Kiezel', min: 300, quip: 'Dat zit er al aardig in.', color: '#6fd6ff' },
  {
    id: 'zandkorrel',
    name: 'Zandkorrel',
    min: 1,
    quip: 'Een klein putje, maar het telt.',
    color: '#d9c49a',
  },
  {
    id: 'mis',
    name: 'Mis gegraven',
    min: 0,
    quip: 'Je schep raakte de grond niet eens.',
    color: '#9fb0c3',
  },
];

export function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]!;
}
