import { hashString, mulberry32, shuffle } from './rng';

export const ROUNDS_PER_PUZZLE = 7;

/**
 * Kiest de vragen van één puzzel. Deterministisch: dezelfde seed en dezelfde vragenlijst geven
 * altijd dezelfde puzzel. Elke vraag komt hooguit één keer voor. De lijst wordt op id
 * gesorteerd, zodat de volgorde in de index niet uitmaakt.
 */
export function getPuzzle<T extends { id: string }>(seed: string, items: readonly T[]): T[] {
  if (items.length < ROUNDS_PER_PUZZLE) {
    throw new Error(`Too few prompts: ${items.length} (need ${ROUNDS_PER_PUZZLE})`);
  }
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rand = mulberry32(hashString(`coredive:${seed}`));
  return shuffle(sorted, rand).slice(0, ROUNDS_PER_PUZZLE);
}
