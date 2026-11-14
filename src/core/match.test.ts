import { describe, expect, it } from 'vitest';
import { AnswerMatcher, allowedTypos, editDistance, normalize, variants } from './match';
import { DOGS } from './fixtures';

const matcher = new AnswerMatcher(DOGS);
const name = (text: string) => {
  const m = matcher.match(text);
  return m ? DOGS[m.index]!.name : null;
};

describe('normalize', () => {
  it.each([
    ['Crème brûlée', 'creme brulee'],
    ['  Shiba-Inu! ', 'shiba inu'],
    ['Weißwurst', 'weisswurst'],
    ['Smørrebrød', 'smorrebrod'],
  ])('%s → %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe('editDistance en allowedTypos', () => {
  it('telt tikfouten en omwisselingen', () => {
    expect(editDistance('beagle', 'beagel')).toBe(1);
    expect(editDistance('poodle', 'poodle')).toBe(0);
    expect(editDistance('abc', 'xyz')).toBe(3);
  });

  it('staat bij korte woorden geen tikfouten toe', () => {
    expect(allowedTypos(4)).toBe(0);
    expect(allowedTypos(6)).toBe(1);
    expect(allowedTypos(12)).toBe(2);
  });
});

describe('variants', () => {
  it('haalt lidwoorden en meervouden weg', () => {
    expect(variants('the beagles')).toContain('beagle');
    expect(variants('wolves')).toContain('wolf');
    expect(variants('puppies')).toContain('puppy');
    expect(variants('boxes')).toContain('box');
    expect(variants('grass')).not.toContain('gras');
  });
});

describe('AnswerMatcher', () => {
  it.each([
    ['German Shepherd', 'German Shepherd'],
    ['german shepherd', 'German Shepherd'],
    ['Alsatian', 'German Shepherd'],
    ['lab', 'Labrador Retriever'],
    ['sausage dog', 'Dachshund'],
    ['Beagles', 'Beagle'],
    ['the poodles', 'Poodle'],
    ['Lagoto Romagnolo', 'Lagotto Romagnolo'],
    ['xoloitzcuintli', 'Xoloitzcuintle'],
    ['husky', 'Siberian Husky'],
  ])('"%s" → %s', (text, expected) => {
    expect(name(text)).toBe(expected);
  });

  it('vindt een los kernwoord bij het bekendste antwoord ermee', () => {
    expect(matcher.match('retriever')).toEqual({ index: 1, kind: 'head' });
    expect(name('hound')).toBe('Afghan Hound');
  });

  it('geeft null bij onbekende of te korte invoer', () => {
    expect(matcher.match('cat')).toBeNull();
    expect(matcher.match('poo')).toBeNull();
    expect(matcher.match('   ')).toBeNull();
    expect(matcher.match('a dog')).toBeNull();
  });

  it('accepteert geen voorvoegsel: "pu" is geen Pumi', () => {
    expect(matcher.match('pu')).toBeNull();
  });
});
