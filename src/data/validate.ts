import type { Country, Stat } from './types';

export interface ValidateOptions {
  /** Minimaal aantal landen met een waarde per statistiek. */
  minCoverage: number;
  /** Minimaal aantal statistieken (een puzzel heeft er 7 nodig). */
  minStats: number;
}

export const DEFAULT_VALIDATE_OPTIONS: ValidateOptions = { minCoverage: 150, minStats: 7 };

const simpleNorm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Geeft een lijst foutmeldingen terug; een lege lijst betekent dat de data in orde is. */
export function validateData(
  countries: Country[],
  stats: Stat[],
  options: ValidateOptions = DEFAULT_VALIDATE_OPTIONS,
): string[] {
  const errors: string[] = [];
  const iso3s = new Set<string>();
  const iso2s = new Set<string>();
  const nameOwner = new Map<string, string>();

  for (const c of countries) {
    if (!/^[A-Z]{3}$/.test(c.iso3)) errors.push(`Land ${c.iso3}: ongeldige iso3`);
    if (!/^[A-Z]{2}$/.test(c.iso2)) errors.push(`Land ${c.iso3}: ongeldige iso2 "${c.iso2}"`);
    if (iso3s.has(c.iso3)) errors.push(`Land ${c.iso3}: dubbele iso3`);
    if (iso2s.has(c.iso2)) errors.push(`Land ${c.iso3}: dubbele iso2 ${c.iso2}`);
    iso3s.add(c.iso3);
    iso2s.add(c.iso2);
    if (!c.nameNl.trim()) errors.push(`Land ${c.iso3}: lege Nederlandse naam`);
    if (!c.nameEn.trim()) errors.push(`Land ${c.iso3}: lege Engelse naam`);

    // Elke naam of alias mag maar bij één land horen, anders is de matching dubbelzinnig.
    for (const name of [c.nameNl, c.nameEn, ...c.aliases]) {
      const key = simpleNorm(name);
      const owner = nameOwner.get(key);
      if (owner && owner !== c.iso3) {
        errors.push(`Naam "${name}" hoort bij zowel ${owner} als ${c.iso3}`);
      }
      nameOwner.set(key, c.iso3);
    }
  }

  const statIds = new Set<string>();
  for (const s of stats) {
    const label = `Statistiek ${s.id}`;
    if (statIds.has(s.id)) errors.push(`${label}: dubbele id`);
    statIds.add(s.id);
    if (!s.question.trim().endsWith('?')) errors.push(`${label}: vraag eindigt niet op "?"`);
    if (!Number.isInteger(s.year)) errors.push(`${label}: ongeldig peiljaar`);

    const entries = Object.entries(s.values);
    for (const [iso3, v] of entries) {
      if (!iso3s.has(iso3)) errors.push(`${label}: onbekend land ${iso3}`);
      if (!Number.isFinite(v) || v < 0) errors.push(`${label}: ongeldige waarde ${v} voor ${iso3}`);
    }
    if (entries.length < options.minCoverage) {
      errors.push(`${label}: maar ${entries.length} landen (minimaal ${options.minCoverage})`);
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
