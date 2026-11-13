import { describe, expect, it } from 'vitest';
import { stats } from '../data';
import type { Stat } from '../data/types';
import {
  MEDIAN_SCORE,
  baseScore,
  bestValue,
  kForStat,
  scoreRound,
  spreadOrders,
  timePenalty,
} from './scoring';

const stat = (values: Record<string, number>): Stat => ({
  id: 'x',
  question: 'Welk land heeft de hoogste x?',
  unit: '',
  format: 'fixed',
  decimals: 0,
  year: 2024,
  source: 'test',
  sourceUrl: '',
  values,
});

// Mediaan (bovenste van 4) = 100, max = 1000 → spreiding 1 orde → K = 1 / 0,7.
const wide = stat({ AAA: 1000, BBB: 100, CCC: 10, DDD: 1 });

describe('spreadOrders en kForStat', () => {
  it('meet log10(max / mediaan)', () => {
    expect(spreadOrders(wide)).toBeCloseTo(1);
    expect(kForStat(wide)).toBeCloseTo(1 / (1 - MEDIAN_SCORE));
  });

  it('negeert nulwaarden bij de mediaan', () => {
    expect(spreadOrders(stat({ AAA: 1000, BBB: 100, CCC: 0 }))).toBeCloseTo(0);
  });
});

describe('baseScore', () => {
  const k = kForStat(wide);
  const best = bestValue(wide);

  it('geeft 1000 voor het beste land', () => {
    expect(baseScore(1000, best, k)).toBe(1000);
  });

  it('geeft het mediaanland MEDIAN_SCORE × 1000', () => {
    expect(baseScore(100, best, k)).toBe(Math.round(MEDIAN_SCORE * 1000));
  });

  it('geeft 0 bij te grote afstand, waarde 0 of geen waarde', () => {
    expect(baseScore(1, best, k)).toBe(0);
    expect(baseScore(0, best, k)).toBe(0);
    expect(baseScore(undefined, best, k)).toBe(0);
  });

  it('daalt monotoon met de waarde', () => {
    const scores = [1000, 700, 400, 200, 100, 50].map((v) => baseScore(v, best, k));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

describe('timePenalty', () => {
  it.each([
    [0, 0],
    [5, 0],
    [5.9, 0],
    [6, 10],
    [20, 150],
    [35, 300],
    [59, 300],
  ])('na %s s is de straf %s', (seconds, penalty) => {
    expect(timePenalty(seconds)).toBe(penalty);
  });
});

describe('scoreRound', () => {
  it('trekt de tijdstraf af', () => {
    expect(scoreRound(wide, 'AAA', 10)).toEqual({
      base: 1000,
      penalty: 50,
      total: 950,
      noData: false,
      timedOut: false,
    });
  });

  it('wordt nooit negatief', () => {
    expect(scoreRound(wide, 'CCC', 40).total).toBe(0);
  });

  it('geeft 0 bij geen data, geen keuze of de tijdslimiet', () => {
    expect(scoreRound(wide, 'ZZZ', 3)).toMatchObject({ total: 0, noData: true });
    expect(scoreRound(wide, null, 60)).toMatchObject({ total: 0, timedOut: true });
    expect(scoreRound(wide, 'AAA', 60)).toMatchObject({ total: 0, timedOut: true });
  });
});

describe('echte data', () => {
  it.each(stats.map((s) => [s.id, s] as const))(
    '%s: beste land 1000, mediaanland ~%s',
    (_id, s) => {
      const k = kForStat(s);
      const vals = Object.values(s.values)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      const median = vals[Math.floor(vals.length / 2)]!;
      expect(baseScore(bestValue(s), bestValue(s), k)).toBe(1000);
      expect(baseScore(median, bestValue(s), k)).toBe(Math.round(MEDIAN_SCORE * 1000));
    },
  );
});
