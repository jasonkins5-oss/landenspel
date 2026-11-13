import { describe, expect, it } from 'vitest';
import { stats } from '../data';
import { ROUNDS_PER_PUZZLE, getPuzzle } from './puzzle';

describe('getPuzzle', () => {
  it('geeft 7 verschillende statistieken', () => {
    const puzzle = getPuzzle('2026-11-13', stats);
    expect(puzzle).toHaveLength(ROUNDS_PER_PUZZLE);
    expect(new Set(puzzle.map((s) => s.id)).size).toBe(ROUNDS_PER_PUZZLE);
  });

  it('is deterministisch en onafhankelijk van de volgorde in stats.json', () => {
    const a = getPuzzle('2026-11-13', stats).map((s) => s.id);
    const b = getPuzzle('2026-11-13', [...stats].reverse()).map((s) => s.id);
    expect(a).toEqual(b);
  });

  it('verschilt per dag', () => {
    const a = getPuzzle('2026-11-13', stats).map((s) => s.id);
    const b = getPuzzle('2026-11-14', stats).map((s) => s.id);
    expect(a).not.toEqual(b);
  });

  it('gebruikt alle statistieken over een langere periode', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 60; day++) {
      const key = `2027-01-${String(Math.min(day, 28)).padStart(2, '0')}`;
      const alt = day > 28 ? `2027-02-${String(day - 28).padStart(2, '0')}` : key;
      for (const s of getPuzzle(alt, stats)) seen.add(s.id);
    }
    expect(seen.size).toBe(stats.length);
  });

  it('weigert te weinig statistieken', () => {
    expect(() => getPuzzle('2026-11-13', stats.slice(0, 3))).toThrow();
  });
});
