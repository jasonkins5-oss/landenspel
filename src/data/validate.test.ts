import { describe, expect, it } from 'vitest';
import { countries, stats } from './index';
import type { Country, Stat } from './types';
import { validateData } from './validate';

const nl: Country = { iso3: 'NLD', iso2: 'NL', nameNl: 'Nederland', nameEn: 'Netherlands', aliases: ['Holland'] };
const be: Country = { iso3: 'BEL', iso2: 'BE', nameNl: 'België', nameEn: 'Belgium', aliases: [] };

const stat = (values: Record<string, number>, id = 'x'): Stat => ({
  id,
  question: 'Welk land heeft de hoogste x?',
  unit: '',
  format: 'fixed',
  decimals: 0,
  year: 2022,
  source: 'test',
  sourceUrl: '',
  values,
});

const opts = { minCoverage: 2, minStats: 1 };

describe('validateData', () => {
  it('accepteert geldige data', () => {
    expect(validateData([nl, be], [stat({ NLD: 2, BEL: 1 })], opts)).toEqual([]);
  });

  it('staat een waarde 0 toe (die scoort later gewoon 0)', () => {
    expect(validateData([nl, be], [stat({ NLD: 2, BEL: 0 })], opts)).toEqual([]);
  });

  it('meldt een gelijke stand op de eerste plaats', () => {
    expect(validateData([nl, be], [stat({ NLD: 5, BEL: 5 })], opts)).toEqual([
      'Statistiek x: gelijke stand op de eerste plaats (5)',
    ]);
  });

  it('meldt negatieve waarden, onbekende landen en te weinig dekking', () => {
    const errors = validateData([nl, be], [stat({ NLD: -1, XXX: 3 })], { minCoverage: 3, minStats: 1 });
    expect(errors).toContain('Statistiek x: ongeldige waarde -1 voor NLD');
    expect(errors).toContain('Statistiek x: onbekend land XXX');
    expect(errors).toContain('Statistiek x: maar 2 landen (minimaal 3)');
  });

  it('meldt een alias die bij twee landen hoort', () => {
    const errors = validateData([nl, { ...be, aliases: ['holland'] }], [stat({ NLD: 2, BEL: 1 })], opts);
    expect(errors).toEqual(['Naam "holland" hoort bij zowel NLD als BEL']);
  });

  it('meldt te weinig statistieken', () => {
    expect(validateData([nl, be], [], opts)).toEqual(['Maar 0 statistieken (minimaal 1)']);
  });
});

describe('gegenereerde data', () => {
  it('doorstaat de validatie', () => {
    expect(validateData(countries, stats)).toEqual([]);
  });
});
