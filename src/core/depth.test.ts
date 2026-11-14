import { describe, expect, it } from 'vitest';
import {
  DEPTH_FACTS,
  EARTH_RADIUS_KM,
  LAYERS,
  MAX_DEPTH_UNITS,
  TIERS,
  formatDepth,
  kmToUnits,
  layerAt,
  tierFor,
  unitsToKm,
} from './depth';

describe('unitsToKm en kmToUnits', () => {
  it('begint aan de oppervlakte en eindigt in het middelpunt', () => {
    expect(unitsToKm(0)).toBe(0);
    expect(unitsToKm(MAX_DEPTH_UNITS)).toBe(EARTH_RADIUS_KM);
    expect(unitsToKm(-10)).toBe(0);
    expect(unitsToKm(99999)).toBe(EARTH_RADIUS_KM);
  });

  it('valt op de laaggrenzen samen met de echte diepte', () => {
    expect(unitsToKm(1500)).toBe(35);
    expect(unitsToKm(4500)).toBe(2890);
    expect(unitsToKm(6000)).toBe(5150);
  });

  it('is strikt stijgend en omkeerbaar', () => {
    let previous = -1;
    for (let u = 0; u <= MAX_DEPTH_UNITS; u += 50) {
      const km = unitsToKm(u);
      expect(km).toBeGreaterThan(previous);
      expect(kmToUnits(km)).toBeCloseTo(u, 6);
      previous = km;
    }
  });
});

describe('formatDepth', () => {
  it.each([
    [0, '0 m'],
    [0.105, '105 m'],
    [12.34, '12.3 km'],
    [35, '35 km'],
    [2890, '2,890 km'],
    [6371, '6,371 km'],
  ])('%s km → %s', (km, text) => {
    expect(formatDepth(km)).toBe(text);
  });
});

describe('LAYERS en layerAt', () => {
  it('sluiten zonder gaten op elkaar aan, van 0 tot het middelpunt', () => {
    expect(LAYERS[0]!.from).toBe(0);
    expect(LAYERS[LAYERS.length - 1]!.to).toBe(MAX_DEPTH_UNITS);
    for (let i = 1; i < LAYERS.length; i++) expect(LAYERS[i]!.from).toBe(LAYERS[i - 1]!.to);
  });

  it('vindt de laag bij een diepte', () => {
    expect(layerAt(0).id).toBe('soil');
    expect(layerAt(499).id).toBe('soil');
    expect(layerAt(500).id).toBe('crust');
    expect(layerAt(4410).id).toBe('lower-mantle');
    expect(layerAt(MAX_DEPTH_UNITS).id).toBe('inner-core');
  });
});

describe('DEPTH_FACTS', () => {
  it('staan op volgorde en binnen de aarde', () => {
    const kms = DEPTH_FACTS.map((f) => f.km);
    expect([...kms].sort((a, b) => a - b)).toEqual(kms);
    expect(Math.max(...kms)).toBeLessThanOrEqual(EARTH_RADIUS_KM);
  });

  it('liggen ver genoeg uit elkaar om leesbaar te blijven', () => {
    const units = DEPTH_FACTS.map((f) => kmToUnits(f.km));
    for (let i = 1; i < units.length; i++)
      expect(units[i]! - units[i - 1]!).toBeGreaterThanOrEqual(60);
  });
});

describe('tierFor', () => {
  it.each([
    [1000, 'core'],
    [900, 'core'],
    [899, 'magma'],
    [700, 'magma'],
    [500, 'bedrock'],
    [499, 'clay'],
    [300, 'clay'],
    [299, 'topsoil'],
    [100, 'topsoil'],
    [0, 'missed'],
  ])('%s punten → %s', (score, id) => {
    expect(tierFor(score).id).toBe(id);
  });

  it('heeft tiers van hoog naar laag, eindigend bij 0', () => {
    const mins = TIERS.map((t) => t.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
    expect(mins[mins.length - 1]).toBe(0);
  });
});
