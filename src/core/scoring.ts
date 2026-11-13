import type { Stat } from '../data/types';

export const MAX_POINTS = 1000;
/**
 * K wordt per statistiek zo gekozen dat een land precies op de mediaan deze fractie van de
 * maximale punten krijgt. Zo is elke vraag ongeveer even streng, of de waarden nu over 0,1
 * of over 3 ordes van grootte verspreid zijn.
 */
export const MEDIAN_SCORE = 0.3;
/** Ondergrens voor K, zodat een statistiek met heel kleine spreiding niet onspeelbaar wordt. */
const MIN_K = 0.01;

export const GRACE_SECONDS = 5;
export const PENALTY_PER_SECOND = 10;
export const MAX_PENALTY = 300;
export const TIME_LIMIT_SECONDS = 60;

/** Positieve waarden van een statistiek, oplopend gesorteerd. */
function sortedPositive(stat: Stat): number[] {
  return Object.values(stat.values)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
}

export function bestValue(stat: Stat): number {
  return Math.max(...Object.values(stat.values));
}

/** Aantal ordes van grootte tussen het hoogste land en de mediaan: log10(max / mediaan). */
export function spreadOrders(stat: Stat): number {
  const vals = sortedPositive(stat);
  if (vals.length === 0) return 0;
  const median = vals[Math.floor(vals.length / 2)]!;
  return Math.log10(vals[vals.length - 1]! / median);
}

/** Afstand (in ordes van grootte) waarbij een antwoord 0 punten oplevert. */
export function kForStat(stat: Stat): number {
  return Math.max(MIN_K, spreadOrders(stat) / (1 - MEDIAN_SCORE));
}

/** Punten vóór tijdstraf: 1000 × max(0, 1 − log10(beste / waarde) / K). */
export function baseScore(value: number | undefined, best: number, k: number): number {
  if (value === undefined || value <= 0 || best <= 0) return 0;
  const distance = Math.log10(best / value);
  return Math.round(MAX_POINTS * Math.max(0, 1 - distance / k));
}

export function timePenalty(seconds: number): number {
  const over = Math.max(0, Math.floor(seconds) - GRACE_SECONDS);
  return Math.min(MAX_PENALTY, over * PENALTY_PER_SECOND);
}

export interface RoundScore {
  base: number;
  penalty: number;
  total: number;
  /** Het land heeft geen waarde voor deze statistiek. */
  noData: boolean;
  timedOut: boolean;
}

/**
 * Score voor één ronde. `iso3` is null als de speler niets heeft ingediend binnen de tijd.
 */
export function scoreRound(stat: Stat, iso3: string | null, seconds: number): RoundScore {
  const timedOut = iso3 === null || seconds >= TIME_LIMIT_SECONDS;
  const value = iso3 === null ? undefined : stat.values[iso3];
  const noData = iso3 !== null && value === undefined;
  if (timedOut || noData) {
    return { base: 0, penalty: 0, total: 0, noData, timedOut };
  }
  const base = baseScore(value, bestValue(stat), kForStat(stat));
  const penalty = timePenalty(seconds);
  return { base, penalty, total: Math.max(0, base - penalty), noData, timedOut };
}
