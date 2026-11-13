import countriesJson from './countries.json';
import landenStatsJson from './categories/landen-stats.json';
import dierenJson from './categories/dieren.json';
import sportStatsJson from './categories/sport-stats.json';
import type { Category, CategoryId, Country, Item, Stat } from './types';

// countries.json en landen-stats.json worden gegenereerd door `npm run data:fetch`;
// dieren.json en sport-stats.json zijn handwerk. Alles wordt gecontroleerd door `npm run data:validate`.
export const countries = countriesJson as Country[];
/** De statistieken van de categorie Landen (versie 1 noemde dit `stats`). */
export const stats = landenStatsJson as Stat[];

const WORLD_BANK = { text: 'World Bank (CC BY 4.0)', url: 'https://data.worldbank.org/' };
const WIKIPEDIA = { text: 'Wikipedia (CC BY-SA 4.0)', url: 'https://www.wikipedia.org/' };

export const categories: Category[] = [
  {
    id: 'landen',
    title: 'Landen',
    tagline: 'Welk land heeft de meeste inwoners, het grootste bos, het hoogste bbp?',
    emoji: '🌍',
    placeholder: 'Typ een land…',
    noun: 'land',
    attribution: WORLD_BANK,
    minCoverage: 150,
    items: countries,
    stats,
  },
  {
    id: 'dieren',
    title: 'Dieren',
    tagline: 'Welk dier is het snelst, het zwaarst, het oudst?',
    emoji: '🐘',
    placeholder: 'Typ een dier…',
    noun: 'dier',
    attribution: WIKIPEDIA,
    minCoverage: 15,
    items: (dierenJson as { items: Item[]; stats: Stat[] }).items,
    stats: (dierenJson as { items: Item[]; stats: Stat[] }).stats,
  },
  {
    id: 'sport',
    title: 'Sport',
    tagline: 'Welk land won het meest: medailles, WK-finales, de Tour?',
    emoji: '🏅',
    placeholder: 'Typ een land…',
    noun: 'land',
    attribution: WIKIPEDIA,
    minCoverage: 20,
    items: countries,
    stats: sportStatsJson as unknown as Stat[],
  },
];

export function findCategory(id: string | null | undefined): Category | undefined {
  return categories.find((c) => c.id === (id as CategoryId));
}

export type { Category, CategoryId, Country, Item, Stat } from './types';
