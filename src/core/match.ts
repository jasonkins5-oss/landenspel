import type { Answer } from './answers';

/** Kleine letters, geen accenten, geen leestekens, enkele spaties. "Pão de Queijo" → "pao de queijo". */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
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

/** Toegestane tikfouten per lengte. Korte woorden zijn te snel een ander, echt bestaand antwoord. */
export function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

/** Varianten van een getypt antwoord: zonder lidwoord, enkelvoud. "The Wolves" → "wolves", "wolve", "wolf". */
export function variants(key: string): string[] {
  const base = key.replace(/^(the|a|an) /, '');
  const out = new Set([key, base]);
  if (base.endsWith('ies') && base.length > 4) out.add(base.slice(0, -3) + 'y');
  if (base.endsWith('ves') && base.length > 4) out.add(base.slice(0, -3) + 'f');
  if (base.endsWith('es') && base.length > 3) out.add(base.slice(0, -2));
  if (base.endsWith('s') && !base.endsWith('ss') && base.length > 3) out.add(base.slice(0, -1));
  return [...out];
}

export type MatchKind = 'exact' | 'variant' | 'typo' | 'head';

export interface AnswerMatch {
  /** Index in de antwoordlijst (0 = bekendste). */
  index: number;
  kind: MatchKind;
}

/**
 * Zoekt een vrij getypt antwoord op in de antwoordlijst van één vraag. Geen suggesties: alleen
 * bij indienen, en alleen een echte treffer telt. Volgorde: exacte naam of alias, dan enkelvoud
 * en zonder lidwoord, dan een kleine tikfout, en als laatste een los kernwoord ("eagle" → de
 * bekendste arend). Bij meerdere kandidaten wint het bekendste antwoord.
 */
export class AnswerMatcher {
  /** Genormaliseerde naam of alias → index van het bekendste antwoord met die sleutel. */
  private readonly keys = new Map<string, number>();
  /** Laatste woord van een naam → index van het bekendste antwoord met dat kernwoord. */
  private readonly heads = new Map<string, number>();

  constructor(answers: readonly Answer[]) {
    answers.forEach((answer, index) => {
      for (const name of [answer.name, ...answer.aliases]) {
        const key = normalize(name);
        if (key && !this.keys.has(key)) this.keys.set(key, index);
      }
      const words = normalize(answer.name).split(' ');
      const head = words[words.length - 1];
      if (words.length > 1 && head && head.length >= 3 && !this.heads.has(head))
        this.heads.set(head, index);
    });
  }

  match(text: string): AnswerMatch | null {
    const key = normalize(text);
    if (!key) return null;

    const exact = this.keys.get(key);
    if (exact !== undefined) return { index: exact, kind: 'exact' };

    for (const v of variants(key)) {
      const hit = this.keys.get(v);
      if (hit !== undefined) return { index: hit, kind: 'variant' };
    }

    const typos = allowedTypos(key.length);
    if (typos > 0) {
      let best: { index: number; distance: number } | null = null;
      for (const [candidate, index] of this.keys) {
        if (Math.abs(candidate.length - key.length) > typos) continue;
        const distance = editDistance(candidate, key);
        if (distance > typos) continue;
        if (
          !best ||
          distance < best.distance ||
          (distance === best.distance && index < best.index)
        ) {
          best = { index, distance };
        }
      }
      if (best) return { index: best.index, kind: 'typo' };
    }

    if (!key.includes(' ')) {
      for (const v of variants(key)) {
        const head = this.heads.get(v);
        if (head !== undefined) return { index: head, kind: 'head' };
      }
    }
    return null;
  }
}
