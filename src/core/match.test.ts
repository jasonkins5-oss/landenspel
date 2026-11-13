import { describe, expect, it } from 'vitest';
import { categories, countries } from '../data';
import { Matcher, allowedTypos, editDistance, normalize } from './match';

const matcher = new Matcher(countries);
const first = (q: string) => matcher.search(q)[0]?.item.id;
const resolved = (q: string) => matcher.resolve(q)?.id ?? null;

describe('normalize', () => {
  it.each([
    ['België', 'belgie'],
    ['São Tomé and Príncipe', 'sao tome and principe'],
    ["Côte d'Ivoire", 'cote d ivoire'],
    ['  Zuid-Korea ', 'zuid korea'],
    ['IJsland', 'ijsland'],
  ])('%s → %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe('editDistance', () => {
  it.each([
    ['brazilie', 'brazilie', 0],
    ['brasil', 'brazil', 1],
    ['nederalnd', 'nederland', 1],
    ['fnland', 'finland', 1],
    ['abc', 'xyz', 3],
  ])('%s vs %s = %s', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
  });
});

describe('allowedTypos', () => {
  it('staat geen tikfouten toe bij korte termen', () => {
    expect(allowedTypos(2)).toBe(0);
    expect(allowedTypos(5)).toBe(1);
    expect(allowedTypos(9)).toBe(2);
  });
});

describe('Matcher.search op landen', () => {
  it.each([
    ['nederland', 'NLD'],
    ['Netherlands', 'NLD'],
    ['holland', 'NLD'],
    ['VS', 'USA'],
    ['usa', 'USA'],
    ['amerika', 'USA'],
    ['VK', 'GBR'],
    ['engeland', 'GBR'],
    ['Brazilie', 'BRA'],
    ['brasil', 'BRA'],
    ['zuid korea', 'KOR'],
    ['korea', 'KOR'],
    ['noord-korea', 'PRK'],
    ['Turkey', 'TUR'],
    ['turkije', 'TUR'],
    ['ivoorkust', 'CIV'],
    ['cote divoire', 'CIV'],
    ['tsjechie', 'CZE'],
    ['duitsalnd', 'DEU'],
    ['swaziland', 'SWZ'],
    ['burma', 'MMR'],
    ['VAE', 'ARE'],
    ['emiraten', 'ARE'],
    ['dr congo', 'COD'],
    ['hongkong', 'HKG'],
  ])('"%s" → %s', (query, id) => {
    expect(first(query)).toBe(id);
  });

  it('zet een korte exacte naam vóór een langere met dezelfde prefix', () => {
    expect(matcher.search('niger').map((m) => m.item.id).slice(0, 2)).toEqual(['NER', 'NGA']);
  });

  it('zet prefix vóór substring', () => {
    const ids = matcher.search('guinea').map((m) => m.item.id);
    expect(ids[0]).toBe('GIN');
    expect(ids).toContain('GNQ');
    expect(ids).toContain('PNG');
  });

  it('geeft maximaal één treffer per land', () => {
    const ids = matcher.search('congo').map((m) => m.item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('COG');
    expect(ids).toContain('COD');
  });

  it('respecteert de limiet en geeft niets bij lege invoer', () => {
    expect(matcher.search('a', 3)).toHaveLength(3);
    expect(matcher.search('   ')).toEqual([]);
  });

  it('vindt niets bij onzin', () => {
    expect(matcher.search('qzxwv')).toEqual([]);
  });
});

describe('Matcher.search op dieren', () => {
  const dieren = new Matcher(categories.find((c) => c.id === 'dieren')!.items);
  it.each([
    ['cheetah', 'jachtluipaard'],
    ['jachtluipaard', 'jachtluipaard'],
    ['olifant', 'olifant'],
    ['walvis', 'blauwe-vinvis'],
    ['pinguin', 'keizerspinguin'],
    ['pingiun', 'keizerspinguin'],
    ['schildpad', 'reuzenschildpad'],
    ['vleermuis', 'buldogvleermuis'],
  ])('"%s" → %s', (query, id) => {
    expect(dieren.search(query)[0]?.item.id).toBe(id);
  });
});

describe('Matcher.resolve', () => {
  it.each([
    ['Nederland', 'NLD'],
    ['nederalnd', 'NLD'],
    ['VS', 'USA'],
    ['Brazilie', 'BRA'],
  ])('"%s" → %s', (query, id) => {
    expect(resolved(query)).toBe(id);
  });

  it('weigert dubbelzinnige invoer', () => {
    expect(resolved('congo')).toBe('COG');
    expect(resolved('guinea')).toBe('GIN');
    expect(resolved('ni')).toBeNull();
    expect(resolved('')).toBeNull();
  });
});
