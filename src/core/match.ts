import type { Item } from '../data/types';

/** Kleine letters, geen accenten, geen leestekens, enkele spaties. "Sao Tomé" → "sao tome". */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ĳ/g, 'ij')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Damerau-Levenshtein (optimal string alignment): tikfouten, ontbrekende letters, omwisselingen. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[m]![n]!;
}

/** Toegestane tikfouten per zoektermlengte. Korte termen zijn te vaak dubbelzinnig. */
export function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

export type MatchKind = 'exact' | 'prefix' | 'word-prefix' | 'substring' | 'fuzzy';

export interface Match<T extends Item = Item> {
  item: T;
  /** Welke naam of alias de treffer gaf. */
  via: string;
  kind: MatchKind;
}

const KIND_ORDER: Record<MatchKind, number> = {
  exact: 0,
  prefix: 1,
  'word-prefix': 2,
  substring: 3,
  fuzzy: 4,
};

interface Entry<T extends Item> {
  item: T;
  via: string;
  key: string;
}

/**
 * Index over alle namen en aliassen van een lijst items (landen, dieren, …). Eén keer
 * bouwen; daarna is zoeken goedkoop genoeg voor elke toetsaanslag.
 */
export class Matcher<T extends Item = Item> {
  private readonly entries: Entry<T>[];

  constructor(items: readonly T[]) {
    this.entries = items.flatMap((item) =>
      [item.nameNl, item.nameEn, ...item.aliases].map((via) => ({
        item,
        via,
        key: normalize(via),
      })),
    );
  }

  /**
   * Beste treffers, maximaal `limit`, één per item. Volgorde: exact, begin van de naam,
   * begin van een woord, ergens in de naam, en dan tikfouten. Binnen één soort op naamlengte,
   * zodat "Niger" vóór "Nigeria" komt.
   */
  search(query: string, limit = 6): Match<T>[] {
    const q = normalize(query);
    if (!q) return [];
    const typos = allowedTypos(q.length);

    const best = new Map<string, Match<T>>();
    const consider = (entry: Entry<T>, kind: MatchKind) => {
      const current = best.get(entry.item.id);
      if (
        !current ||
        KIND_ORDER[kind] < KIND_ORDER[current.kind] ||
        (KIND_ORDER[kind] === KIND_ORDER[current.kind] && entry.via.length < current.via.length)
      ) {
        best.set(entry.item.id, { item: entry.item, via: entry.via, kind });
      }
    };

    for (const entry of this.entries) {
      const { key } = entry;
      if (key === q) consider(entry, 'exact');
      else if (key.startsWith(q)) consider(entry, 'prefix');
      else if (key.includes(` ${q}`)) consider(entry, 'word-prefix');
      else if (key.includes(q)) consider(entry, 'substring');
      else if (typos > 0 && Math.abs(key.length - q.length) <= typos && editDistance(key, q) <= typos) {
        consider(entry, 'fuzzy');
      }
    }

    return [...best.values()]
      .sort(
        (a, b) =>
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          a.via.length - b.via.length ||
          a.item.nameNl.localeCompare(b.item.nameNl, 'nl'),
      )
      .slice(0, limit);
  }

  /**
   * Het item dat bij Enter wordt ingediend als de speler niets uit de lijst koos.
   * Alleen een ondubbelzinnige treffer telt: precies één exacte, of anders de enige
   * treffer die er is. Bij twijfel null, zodat we nooit stil een verkeerd antwoord kiezen.
   */
  resolve(query: string): T | null {
    const matches = this.search(query, 2);
    const exact = matches.filter((m) => m.kind === 'exact');
    if (exact.length === 1) return exact[0]!.item;
    if (exact.length === 0 && matches.length === 1) return matches[0]!.item;
    return null;
  }
}
