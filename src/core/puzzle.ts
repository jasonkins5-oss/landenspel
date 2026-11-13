import type { Stat } from '../data/types';
import { hashString, mulberry32, shuffle } from './rng';

export const ROUNDS_PER_PUZZLE = 7;

/**
 * Kiest de statistieken van één dag. Deterministisch: dezelfde datum en dezelfde
 * statistiekenlijst geven altijd dezelfde puzzel. Elke statistiek komt hooguit één keer voor.
 * De lijst wordt op id gesorteerd, zodat de volgorde in stats.json niet uitmaakt.
 */
export function getPuzzle(dateKey: string, stats: readonly Stat[]): Stat[] {
  if (stats.length < ROUNDS_PER_PUZZLE) {
    throw new Error(`Te weinig statistieken: ${stats.length} (minimaal ${ROUNDS_PER_PUZZLE})`);
  }
  const sorted = [...stats].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rand = mulberry32(hashString(`landenspel:${dateKey}`));
  return shuffle(sorted, rand).slice(0, ROUNDS_PER_PUZZLE);
}
