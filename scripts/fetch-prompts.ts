/**
 * Haalt de antwoorden van alle vragen in scripts/prompts.ts op uit Wikidata en schrijft:
 *   public/prompts/<id>.json   — de antwoorden van één vraag (wordt pas geladen als nodig)
 *   src/data/prompts.json      — de index: id, vraag, aantal antwoorden
 *
 * Ruwe antwoorden worden gecachet in .cache/wikidata/; `--refresh` haalt alles opnieuw op en
 * `--only=id1,id2` beperkt het tot een paar vragen. Wikidata-data is CC0.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalize } from '../src/core/match';
import { PROMPTS, type PromptDef } from './prompts';

const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = `${root}.cache/wikidata/`;
const outDir = `${root}public/prompts/`;
const indexFile = `${root}src/data/prompts.json`;
const REFRESH = process.argv.includes('--refresh');
const ONLY = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(',');
/** Deze vragen negeren de cache (bijvoorbeeld na een wijziging in hun query). */
const REFETCH = new Set(
  process.argv
    .find((a) => a.startsWith('--refetch='))
    ?.slice(10)
    .split(',') ?? [],
);
const MIN_ANSWERS = 25;
const LIMIT = 3000;
const USER_AGENT = 'CoreDiveBuilder/1.0 (hobby game data build)';

interface Row {
  item: { value: string };
  label: { value: string };
  sitelinks: { value: string };
  aliases?: { value: string };
  taxonName?: { value: string };
}

function query(def: PromptDef): string {
  return `
SELECT ?item ?label ?sitelinks
  (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
  (SAMPLE(?taxon) AS ?taxonName)
WHERE {
  ${def.where}
  ?item wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${def.minSitelinks ?? 1})
  # Wikidata zet namen die in alle talen gelijk zijn onder "mul" (bv. "Toy Story", "Up");
  # die items hebben dan geen "en"-label meer. Dus: Engels, anders "mul".
  OPTIONAL { ?item rdfs:label ?en . FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?mul . FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?label)
  FILTER(BOUND(?label))
  OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias) IN ("en", "mul")) }
  ${def.taxon ? 'OPTIONAL { ?item wdt:P225 ?taxon . }' : ''}
}
GROUP BY ?item ?label ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT ${LIMIT}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Draait een SPARQL-query met cache en herhaalpogingen (bij te veel verzoeken: langer wachten). */
async function runQuery<T>(sparql: string, cacheFile: string, force: boolean): Promise<T[]> {
  if (!force && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8')) as T[];
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    });
    if (res.ok) {
      const json = (await res.json()) as { results: { bindings: T[] } };
      const rows = json.results.bindings;
      writeFileSync(cacheFile, JSON.stringify(rows));
      await sleep(1000);
      return rows;
    }
    if (attempt === 3) throw new Error(`HTTP ${res.status}`);
    await sleep(res.status === 429 ? attempt * 30_000 : attempt * 5000);
  }
  return [];
}

async function fetchRows(def: PromptDef): Promise<Row[]> {
  const force = REFRESH || REFETCH.has(def.id);
  const rows = await runQuery<Row>(query(def), `${cacheDir}${def.id}.json`, force);
  if (!def.exclude) return rows;
  const excluded = await runQuery<{ item: { value: string } }>(
    `SELECT ?item WHERE { ${def.exclude} }`,
    `${cacheDir}${def.id}--exclude.json`,
    force,
  );
  const drop = new Set(excluded.map((r) => r.item.value));
  return rows.filter((r) => !drop.has(r.item.value));
}

/** "Pumi (dog)" → "Pumi"; "beagle" → "Beagle". */
function cleanName(raw: string): string {
  const s = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compact antwoord: [naam, sitelinks, aliassen?]. */
export type AnswerTuple = [string, number, string[]?];

function build(def: PromptDef, rows: Row[]): { answers: AnswerTuple[]; ids: string[] } {
  // Eén item per genormaliseerde naam; het bekendste wint.
  const byName = new Map<
    string,
    { id: string; name: string; sitelinks: number; aliases: Set<string> }
  >();
  for (const row of rows) {
    let name = cleanName(row.label.value);
    const sitelinks = Number(row.sitelinks.value);
    const aliases = new Set<string>();
    for (const a of (row.aliases?.value ?? '').split('|')) if (a) aliases.add(cleanName(a));
    // Groepen als "Strigiformes" hebben een Latijns label; toon dan de Engelse naam ("Owl").
    if (def.taxon && row.taxonName && name === row.taxonName.value) {
      const english = [...aliases].find(
        (a) =>
          /^[A-Za-z][a-z' -]+$/.test(a) && a !== name && !/(idae|iformes|inae|oidea)$/i.test(a),
      );
      if (english) {
        aliases.delete(english);
        aliases.add(name);
        name = cleanName(english);
      }
    }
    const key = normalize(name);
    // Wikimedia-interne pagina's ("MediaWiki:Common.css", "Category:…", "List of …") overslaan.
    if (
      !key ||
      /^q\d+$/.test(key) ||
      name.length > 60 ||
      name.includes(':') ||
      /^list of /i.test(name)
    )
      continue;
    if (def.taxon && row.taxonName) aliases.add(row.taxonName.value);
    // "Common ostrich" → ook "ostrich"; zo noemen mensen het gewoon.
    const plain = name.replace(/^(common|the)\s+/i, '');
    if (plain !== name && plain.length >= 3) aliases.add(cleanName(plain));
    if (def.people) {
      const parts = name.split(' ');
      const last = parts[parts.length - 1];
      if (parts.length > 1 && last && last.length >= 3) aliases.add(last);
    }
    const existing = byName.get(key);
    if (!existing || existing.sitelinks < sitelinks) {
      byName.set(key, { id: row.item.value.split('/').pop()!, name, sitelinks, aliases });
    }
  }

  const items = [...byName.values()].sort(
    (a, b) => b.sitelinks - a.sitelinks || a.name.localeCompare(b.name),
  );
  // Een alias (of naam) hoort bij hooguit één antwoord: het bekendste.
  const taken = new Set(items.map((i) => normalize(i.name)));
  const answers: AnswerTuple[] = [];
  const ids: string[] = [];
  for (const item of items) {
    const aliases = [...item.aliases].filter((a) => {
      const k = normalize(a);
      if (!k || k.length < 2 || k.length > 50 || /^\d+$/.test(k) || taken.has(k)) return false;
      taken.add(k);
      return true;
    });
    answers.push(
      aliases.length > 0 ? [item.name, item.sitelinks, aliases] : [item.name, item.sitelinks],
    );
    ids.push(item.id);
  }
  return { answers, ids };
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const previous: { id: string; prompt: string; count: number }[] = existsSync(indexFile)
    ? (JSON.parse(readFileSync(indexFile, 'utf8')) as {
        id: string;
        prompt: string;
        count: number;
      }[])
    : [];
  const index = new Map(previous.map((p) => [p.id, p]));
  const problems: string[] = [];

  for (const def of PROMPTS) {
    if (ONLY && !ONLY.includes(def.id)) continue;
    try {
      const rows = await fetchRows(def);
      const { answers, ids } = build(def, rows);
      const flag = answers.length < MIN_ANSWERS ? '  ✗ te weinig' : '';
      const top = answers
        .slice(0, 5)
        .map((a) => a[0])
        .join(', ');
      const tail = answers
        .slice(-3)
        .map((a) => a[0])
        .join(', ');
      console.log(
        `${def.id.padEnd(24)} ${String(answers.length).padStart(5)}  ${top}  …  ${tail}${flag}`,
      );
      if (answers.length < MIN_ANSWERS) {
        problems.push(`${def.id}: ${answers.length} antwoorden`);
        index.delete(def.id);
        continue;
      }
      writeFileSync(
        `${outDir}${def.id}.json`,
        JSON.stringify({ id: def.id, prompt: def.prompt, ids, answers }),
      );
      index.set(def.id, { id: def.id, prompt: def.prompt, count: answers.length });
    } catch (err) {
      console.log(`${def.id.padEnd(24)}  ✗ fout: ${(err as Error).message}`);
      problems.push(`${def.id}: ${(err as Error).message}`);
    }
  }

  // Vragen die niet meer in PROMPTS staan vallen uit de index.
  const known = new Set(PROMPTS.map((p) => p.id));
  const entries = [...index.values()]
    .filter((p) => known.has(p.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(indexFile, JSON.stringify(entries, null, 2) + '\n');
  console.log(`\n${entries.length} vragen in de index.`);
  if (problems.length > 0) console.log(`Overgeslagen:\n- ${problems.join('\n- ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
