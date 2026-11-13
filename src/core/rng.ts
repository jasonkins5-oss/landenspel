/** Datum als "YYYY-MM-DD" in UTC. De puzzel wisselt om 00:00 UTC, voor iedereen tegelijk. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Dagen sinds de eerste puzzel; wordt het puzzelnummer in de deeltekst. */
export const FIRST_PUZZLE_DATE = '2026-11-13';

export function puzzleNumber(dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${FIRST_PUZZLE_DATE}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** FNV-1a: stabiele 32-bits hash van een string, als seed voor de generator. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: kleine, deterministische generator. Geeft getallen in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates met een eigen generator; verandert de invoer niet. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
