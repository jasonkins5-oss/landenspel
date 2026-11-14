import { describe, expect, it } from 'vitest';
import { DOGS } from './fixtures';
import { mulberry32 } from './rng';
import {
  MAX_POINTS,
  MIN_POINTS,
  PRIOR_WEIGHT,
  deepCuts,
  mostCommon,
  pointsFor,
  priorWeights,
  rarityOf,
  shares,
} from './rarity';

const indexOf = (name: string) => DOGS.findIndex((d) => d.name === name);

describe('prior en aandelen', () => {
  it('verdeelt PRIOR_WEIGHT nep-antwoorden, bekend krijgt meer', () => {
    const prior = priorWeights(DOGS);
    expect(prior.reduce((s, x) => s + x, 0)).toBeCloseTo(PRIOR_WEIGHT);
    expect(prior[0]!).toBeGreaterThan(prior[DOGS.length - 1]!);
  });

  it('telt op tot 1, met en zonder spelerstellingen', () => {
    const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
    expect(sum(shares(DOGS))).toBeCloseTo(1);
    expect(sum(shares(DOGS, { Q38978: 500, Q21102: 20 }))).toBeCloseTo(1);
  });
});

describe('pointsFor', () => {
  it('loopt van MIN_POINTS naar MAX_POINTS', () => {
    expect(pointsFor(0)).toBe(MIN_POINTS);
    expect(pointsFor(1)).toBe(MAX_POINTS);
    expect(pointsFor(0.5)).toBeGreaterThan(MIN_POINTS);
    expect(pointsFor(2)).toBe(MAX_POINTS);
  });
});

describe('rarityOf', () => {
  it('geeft het bekendste antwoord het minst en een obscuur antwoord het meest', () => {
    const top = rarityOf(DOGS, 0);
    const obscure = rarityOf(DOGS, indexOf('Leopard Tree Dog'));
    expect(top.points).toBe(MIN_POINTS);
    expect(top.rarerThan).toBe(0);
    expect(obscure.points).toBeGreaterThan(950);
    expect(obscure.rarerThan).toBeGreaterThan(0.99);
  });

  it('stijgt naarmate een antwoord onbekender is', () => {
    const points = DOGS.map((_, i) => rarityOf(DOGS, i).points);
    expect([...points].sort((a, b) => a - b)).toEqual(points);
  });

  it('laat spelerstellingen meetellen: een veelgegeven niche-antwoord zakt in punten', () => {
    const pumi = indexOf('Pumi');
    const before = rarityOf(DOGS, pumi).points;
    const after = rarityOf(DOGS, pumi, { Q38978: 1000 }).points;
    expect(after).toBeLessThan(before);
    expect(after).toBe(MIN_POINTS);
  });
});

describe('mostCommon en deepCuts', () => {
  it('geeft de vaakst gegeven antwoorden, gesorteerd', () => {
    const top = mostCommon(DOGS, {}, 3);
    expect(top.map((t) => t.answer.name)).toEqual([
      'German Shepherd',
      'Labrador Retriever',
      'Beagle',
    ]);
    expect(mostCommon(DOGS, { Q5000002: 999 }, 1)[0]!.answer.name).toBe('Leopard Tree Dog');
  });

  it('kiest deterministisch obscure antwoorden, zonder het eigen antwoord', () => {
    const a = deepCuts(DOGS, mulberry32(1), 3, 'Q38978').map((d) => d.name);
    const b = deepCuts(DOGS, mulberry32(1), 3, 'Q38978').map((d) => d.name);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(a).not.toContain('Pumi');
    const tail = new Set(DOGS.slice(Math.floor(DOGS.length * 0.7)).map((d) => d.name));
    for (const n of a) expect(tail.has(n)).toBe(true);
  });
});
