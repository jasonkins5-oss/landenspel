import { describe, expect, it } from 'vitest';
import { PROMPTS } from './fixtures';
import { ROUNDS_PER_PUZZLE, getPuzzle } from './puzzle';

describe('getPuzzle', () => {
  it('geeft 7 verschillende vragen', () => {
    const puzzle = getPuzzle('day:2026-11-13', PROMPTS);
    expect(puzzle).toHaveLength(ROUNDS_PER_PUZZLE);
    expect(new Set(puzzle.map((p) => p.id)).size).toBe(ROUNDS_PER_PUZZLE);
  });

  it('is deterministisch en onafhankelijk van de volgorde in de index', () => {
    const a = getPuzzle('day:2026-11-13', PROMPTS).map((p) => p.id);
    const b = getPuzzle('day:2026-11-13', [...PROMPTS].reverse()).map((p) => p.id);
    expect(a).toEqual(b);
  });

  it('verschilt per seed', () => {
    const a = getPuzzle('day:2026-11-13', PROMPTS).map((p) => p.id);
    const b = getPuzzle('day:2026-11-14', PROMPTS).map((p) => p.id);
    const c = getPuzzle('dive:1', PROMPTS).map((p) => p.id);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('weigert te weinig vragen', () => {
    expect(() => getPuzzle('day:2026-11-13', PROMPTS.slice(0, 3))).toThrow();
  });
});
