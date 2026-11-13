import { describe, expect, it } from 'vitest';
import type { Stat } from '../data/types';
import { formatSeconds, formatValue } from './format';

const base: Stat = {
  id: 'x',
  question: '?',
  unit: 'jaar',
  format: 'fixed',
  decimals: 1,
  year: 2024,
  source: '',
  sourceUrl: '',
  values: {},
};

describe('formatValue', () => {
  it('rondt af met vaste decimalen en een eenheid', () => {
    expect(formatValue(base, 83.456)).toBe('83,5 jaar');
  });

  it('gebruikt compacte notatie boven 1000, 1 mln en 1 mld', () => {
    const stat: Stat = { ...base, unit: 'inwoners', format: 'compact', decimals: 1 };
    expect(formatValue(stat, 950)).toBe('950 inwoners');
    expect(formatValue(stat, 1_250)).toBe('1,3 duizend inwoners');
    expect(formatValue(stat, 1_463_870_000)).toBe('1,5 mld inwoners');
    expect(formatValue(stat, 30_769_700_000_000)).toBe('30.769,7 mld inwoners');
  });

  it('laat de eenheid weg als die leeg is', () => {
    expect(formatValue({ ...base, unit: '' }, 5)).toBe('5,0');
  });
});

describe('formatSeconds', () => {
  it('rondt naar boven af en voegt een s toe', () => {
    expect(formatSeconds(4.2)).toBe('5s');
    expect(formatSeconds(0)).toBe('0s');
    expect(formatSeconds(-1)).toBe('0s');
  });
});
