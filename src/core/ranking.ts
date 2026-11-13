import type { Country, Stat } from '../data/types';

export interface RankedCountry {
  country: Country;
  value: number;
  /** 1 = hoogste waarde. */
  rank: number;
}

/** Alle landen met een waarde, van hoog naar laag. Landen zonder data vallen weg. */
export function rankCountries(stat: Stat, countries: readonly Country[]): RankedCountry[] {
  const byIso = new Map(countries.map((c) => [c.iso3, c]));
  return Object.entries(stat.values)
    .flatMap(([iso3, value]) => {
      const country = byIso.get(iso3);
      return country ? [{ country, value }] : [];
    })
    .sort((a, b) => b.value - a.value || a.country.nameNl.localeCompare(b.country.nameNl, 'nl'))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function rankOf(ranking: readonly RankedCountry[], iso3: string): RankedCountry | undefined {
  return ranking.find((r) => r.country.iso3 === iso3);
}

export function topN(ranking: readonly RankedCountry[], n = 5): RankedCountry[] {
  return ranking.slice(0, n);
}
