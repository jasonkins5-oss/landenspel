import countriesJson from './countries.json';
import statsJson from './stats.json';
import type { Country, Stat } from './types';

// De JSON wordt gegenereerd door `npm run data:fetch` en gecontroleerd door `npm run data:validate`.
export const countries = countriesJson as Country[];
export const stats = statsJson as Stat[];

export type { Country, Stat } from './types';
