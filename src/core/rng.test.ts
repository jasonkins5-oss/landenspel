import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, puzzleNumber, shuffle, utcDateKey } from './rng';

describe('utcDateKey', () => {
  it('gebruikt UTC, niet de lokale dag', () => {
    expect(utcDateKey(new Date('2026-11-13T23:30:00Z'))).toBe('2026-11-13');
    expect(utcDateKey(new Date('2026-11-14T00:00:00Z'))).toBe('2026-11-14');
  });
});

describe('puzzleNumber', () => {
  it('telt vanaf 1 op de eerste dag', () => {
    expect(puzzleNumber('2026-11-13')).toBe(1);
    expect(puzzleNumber('2026-11-20')).toBe(8);
  });
});

describe('hashString en mulberry32', () => {
  it('zijn deterministisch', () => {
    expect(hashString('landenspel:2026-11-13')).toBe(hashString('landenspel:2026-11-13'));
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('geven verschillende reeksen voor verschillende datums', () => {
    const a = mulberry32(hashString('2026-11-13'));
    const b = mulberry32(hashString('2026-11-14'));
    expect(a()).not.toBe(b());
  });

  it('blijven binnen [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('is een permutatie en laat de invoer heel', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(out).not.toEqual(input);
  });
});
