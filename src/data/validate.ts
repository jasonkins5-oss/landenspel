import type { Category, Country, Item, Stat } from './types';

export interface ValidateOptions {
  /** Minimaal aantal items met een waarde per statistiek. */
  minCoverage: number;
  /** Minimaal aantal statistieken (een puzzel heeft er 7 nodig). */
  minStats: number;
}

/** Landen uit de World Bank: bijna volledige dekking. Handgemaakte categorieën zetten hun eigen `minCoverage`. */
export const COUNTRY_VALIDATE_OPTIONS: ValidateOptions = { minCoverage: 150, minStats: 7 };

const simpleNorm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Controles die voor elke itemlijst gelden: unieke id's, namen die bij één item horen. */
export function validateItems(items: readonly Item[], label = 'Item'): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const nameOwner = new Map<string, string>();

  for (const item of items) {
    if (!item.id.trim()) errors.push(`${label} zonder id ("${item.nameNl}")`);
    if (ids.has(item.id)) errors.push(`${label} ${item.id}: dubbele id`);
    ids.add(item.id);
    if (!item.nameNl.trim()) errors.push(`${label} ${item.id}: lege Nederlandse naam`);
    if (!item.nameEn.trim()) errors.push(`${label} ${item.id}: lege Engelse naam`);

    // Elke naam of alias mag maar bij één item horen, anders is de matching dubbelzinnig.
    for (const name of [item.nameNl, item.nameEn, ...item.aliases]) {
      const key = simpleNorm(name);
      const owner = nameOwner.get(key);
      if (owner && owner !== item.id) {
        errors.push(`Naam "${name}" hoort bij zowel ${owner} als ${item.id}`);
      }
      nameOwner.set(key, item.id);
    }
  }
  return errors;
}

/** Extra controles voor landen: ISO-codes. */
export function validateCountries(countries: readonly Country[]): string[] {
  const errors = validateItems(countries, 'Land');
  const iso2s = new Set<string>();
  for (const c of countries) {
    if (!/^[A-Z]{3}$/.test(c.id)) errors.push(`Land ${c.id}: ongeldige iso3`);
    if (!/^[A-Z]{2}$/.test(c.iso2)) errors.push(`Land ${c.id}: ongeldige iso2 "${c.iso2}"`);
    if (iso2s.has(c.iso2)) errors.push(`Land ${c.id}: dubbele iso2 ${c.iso2}`);
    iso2s.add(c.iso2);
  }
  return errors;
}

export function validateStats(
  stats: readonly Stat[],
  items: readonly Item[],
  options: ValidateOptions,
): string[] {
  const errors: string[] = [];
  const ids = new Set(items.map((i) => i.id));
  const statIds = new Set<string>();

  for (const s of stats) {
    const label = `Statistiek ${s.id}`;
    if (statIds.has(s.id)) errors.push(`${label}: dubbele id`);
    statIds.add(s.id);
    if (!s.question.trim().endsWith('?')) errors.push(`${label}: vraag eindigt niet op "?"`);
    if (!Number.isInteger(s.year)) errors.push(`${label}: ongeldig peiljaar`);

    const entries = Object.entries(s.values);
    for (const [id, v] of entries) {
      if (!ids.has(id)) errors.push(`${label}: onbekend item ${id}`);
      if (!Number.isFinite(v) || v < 0) errors.push(`${label}: ongeldige waarde ${v} voor ${id}`);
    }
    if (entries.length < options.minCoverage) {
      errors.push(`${label}: maar ${entries.length} items (minimaal ${options.minCoverage})`);
    }

    const sorted = entries.map(([, v]) => v).sort((a, b) => b - a);
    const [first, second] = sorted;
    if (first === undefined || first <= 0) errors.push(`${label}: hoogste waarde is niet positief`);
    if (first !== undefined && second !== undefined && first === second) {
      errors.push(`${label}: gelijke stand op de eerste plaats (${first})`);
    }
  }

  if (stats.length < options.minStats) {
    errors.push(`Maar ${stats.length} statistieken (minimaal ${options.minStats})`);
  }
  return errors;
}

/** Geeft een lijst foutmeldingen terug; een lege lijst betekent dat de data in orde is. */
export function validateData(
  countries: readonly Country[],
  stats: readonly Stat[],
  options: ValidateOptions = COUNTRY_VALIDATE_OPTIONS,
): string[] {
  return [...validateCountries(countries), ...validateStats(stats, countries, options)];
}

/** Valideert één categorie; items met ISO-codes (landen) krijgen ook de ISO-controle. */
export function validateCategory(category: Category, options?: ValidateOptions): string[] {
  const isCountries = category.items.every((i) => 'iso2' in i);
  const opts = options ?? { minCoverage: category.minCoverage, minStats: 7 };
  const itemErrors = isCountries
    ? validateCountries(category.items as Country[])
    : validateItems(category.items, 'Item');
  return [...itemErrors, ...validateStats(category.stats, category.items, opts)].map(
    (e) => `[${category.id}] ${e}`,
  );
}
