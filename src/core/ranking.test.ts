import { describe, expect, it } from 'vitest';
import { countries, stats } from '../data';
import { rankItems, rankOf, topN } from './ranking';

const population = stats.find((s) => s.id === 'population')!;

describe('rankItems', () => {
  const ranking = rankItems(population, countries);

  it('zet het hoogste land op 1 en nummert door', () => {
    expect(ranking[0]!.rank).toBe(1);
    expect(ranking[0]!.item.id).toBe('IND');
    expect(ranking[1]!.item.id).toBe('CHN');
    expect(ranking.map((r) => r.rank)).toEqual(ranking.map((_, i) => i + 1));
  });

  it('laat landen zonder data weg', () => {
    expect(ranking).toHaveLength(Object.keys(population.values).length);
  });

  it('vindt de rang van een land', () => {
    expect(rankOf(ranking, 'NLD')?.rank).toBeGreaterThan(50);
    expect(rankOf(ranking, 'XXX')).toBeUndefined();
  });

  it('geeft de top 5', () => {
    expect(topN(ranking).map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
