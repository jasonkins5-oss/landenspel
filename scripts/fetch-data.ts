/**
 * Haalt landen en statistieken op en schrijft src/data/countries.json en src/data/stats.json.
 * Lokaal draaien met `npm run data:fetch`; de uitvoer wordt gecommit. De app haalt zelf niets op.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Country, Stat } from '../src/data/types';
import { spreadOrders } from '../src/core/scoring';
import { COUNTRY_VALIDATE_OPTIONS, validateData } from '../src/data/validate';
import { ALIASES, COUNTRY_CODES, NAME_OVERRIDES } from './country-list';
import { INDICATORS, type IndicatorDef } from './indicators';

const FIRST_YEAR = 2010;
const LAST_YEAR = new Date().getUTCFullYear();
const MIN_COVERAGE = COUNTRY_VALIDATE_OPTIONS.minCoverage;
const dataDir = fileURLToPath(new URL('../src/data/', import.meta.url));
const cacheDir = fileURLToPath(new URL('../.cache/worldbank/', import.meta.url));
const REFRESH = process.argv.includes('--refresh');

function buildCountries(): Country[] {
  const nl = new Intl.DisplayNames(['nl'], { type: 'region' });
  const en = new Intl.DisplayNames(['en'], { type: 'region' });
  return COUNTRY_CODES.map(({ iso3, iso2 }) => {
    const nameNl = NAME_OVERRIDES[iso3]?.nl ?? nl.of(iso2) ?? iso3;
    const nameEn = NAME_OVERRIDES[iso3]?.en ?? en.of(iso2) ?? iso3;
    const known = new Set([nameNl.toLowerCase(), nameEn.toLowerCase()]);
    // Aliassen die gelijk zijn aan een van de namen voegen niets toe.
    const aliases = [...new Set(ALIASES[iso3] ?? [])].filter((a) => !known.has(a.toLowerCase()));
    return { id: iso3, iso2, nameNl, nameEn, aliases };
  }).sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl'));
}

interface WbRow {
  countryiso3code: string;
  date: string;
  value: number | null;
}

/**
 * De World Bank-API is traag (~40 s per indicator). Ruwe antwoorden worden daarom gecachet in
 * .cache/worldbank/. Met `--refresh` haal je alles opnieuw op.
 */
async function fetchIndicator(code: string): Promise<WbRow[]> {
  const cacheFile = `${cacheDir}${code}.json`;
  if (!REFRESH && existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, 'utf8')) as WbRow[];
  }
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&date=${FIRST_YEAR}:${LAST_YEAR}&per_page=20000`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as unknown;
      if (!Array.isArray(body) || !Array.isArray(body[1])) {
        throw new Error(`onverwacht antwoord: ${JSON.stringify(body).slice(0, 200)}`);
      }
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cacheFile, JSON.stringify(body[1]));
      return body[1] as WbRow[];
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/** Kiest het meest recente jaar met genoeg dekking, zonder negatieven en zonder gedeelde eerste plaats. */
function pickYear(rows: WbRow[], known: Set<string>): { year: number; values: Record<string, number> } | string {
  const byYear = new Map<number, Record<string, number>>();
  for (const row of rows) {
    if (row.value === null || !known.has(row.countryiso3code)) continue;
    const year = Number(row.date);
    const bucket = byYear.get(year) ?? {};
    bucket[row.countryiso3code] = Number(row.value.toPrecision(6));
    byYear.set(year, bucket);
  }
  const reasons: string[] = [];
  for (const year of [...byYear.keys()].sort((a, b) => b - a)) {
    const values = byYear.get(year)!;
    const vals = Object.values(values).sort((a, b) => b - a);
    if (vals.length < MIN_COVERAGE) {
      reasons.push(`${year}: ${vals.length} landen`);
      continue;
    }
    if (vals.some((v) => v < 0)) {
      reasons.push(`${year}: negatieve waarden`);
      continue;
    }
    if (vals[0] === vals[1]) {
      reasons.push(`${year}: gedeelde eerste plaats`);
      continue;
    }
    return { year, values };
  }
  return reasons.slice(0, 3).join('; ') || 'geen data';
}

async function buildStat(def: IndicatorDef, known: Set<string>): Promise<Stat | string> {
  const rows = await fetchIndicator(def.wbCode);
  const picked = pickYear(rows, known);
  if (typeof picked === 'string') return picked;
  return {
    id: def.id,
    question: def.question,
    unit: def.unit,
    format: def.format,
    decimals: def.decimals,
    year: picked.year,
    source: 'World Bank (CC BY 4.0)',
    sourceUrl: `https://data.worldbank.org/indicator/${def.wbCode}`,
    values: Object.fromEntries(Object.entries(picked.values).sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function main() {
  const countries = buildCountries();
  const known = new Set(countries.map((c) => c.id));
  const nameOf = new Map(countries.map((c) => [c.id, c.nameNl]));
  const stats: Stat[] = [];

  for (const def of INDICATORS) {
    try {
      const result = await buildStat(def, known);
      if (typeof result === 'string') {
        console.warn(`✗ ${def.id.padEnd(22)} overgeslagen (${result})`);
        continue;
      }
      stats.push(result);
      const [topIso, topVal] = Object.entries(result.values).sort(([, a], [, b]) => b - a)[0]!;
      console.log(
        `✓ ${def.id.padEnd(22)} ${result.year}  ${String(Object.keys(result.values).length).padStart(3)} landen` +
          `  spreiding ${spreadOrders(result).toFixed(2)}  top: ${nameOf.get(topIso)} (${topVal})`,
      );
    } catch (err) {
      console.warn(`✗ ${def.id.padEnd(22)} fout: ${(err as Error).message}`);
    }
  }

  const errors = validateData(countries, stats);
  if (errors.length > 0) {
    console.error(`\nValidatie mislukt, er is niets weggeschreven:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }

  writeFileSync(`${dataDir}countries.json`, JSON.stringify(countries, null, 2) + '\n');
  writeFileSync(`${dataDir}categories/landen-stats.json`, JSON.stringify(stats, null, 2) + '\n');
  console.log(`\n${countries.length} landen en ${stats.length} statistieken weggeschreven naar src/data/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
