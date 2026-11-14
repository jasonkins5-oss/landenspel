/**
 * Controleert de vragen in src/data/prompts.json en public/prompts/. Draaien met
 * `npm run data:validate`. Toont per vraag het aantal antwoorden en de punten (zonder
 * spelerstellingen) voor het bekendste antwoord, het antwoord op 25%, 50% en 90% van de lijst.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fromFile, type PromptFile, type PromptMeta } from '../src/core/answers';
import { AnswerMatcher, normalize } from '../src/core/match';
import { rarityOf } from '../src/core/rarity';

export const MIN_PROMPTS = 150;
export const MIN_ANSWERS = 25;

const root = fileURLToPath(new URL('../', import.meta.url));

export function validatePrompts(index: PromptMeta[], read: (id: string) => PromptFile): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const meta of index) {
    if (ids.has(meta.id)) errors.push(`${meta.id}: dubbele id in de index`);
    ids.add(meta.id);
    if (!/^Name /.test(meta.prompt)) errors.push(`${meta.id}: vraag begint niet met "Name "`);
    let file: PromptFile;
    try {
      file = read(meta.id);
    } catch {
      errors.push(`${meta.id}: bestand ontbreekt`);
      continue;
    }
    if (file.answers.length !== file.ids.length)
      errors.push(`${meta.id}: ids en antwoorden lopen uit de pas`);
    if (file.answers.length < MIN_ANSWERS)
      errors.push(`${meta.id}: maar ${file.answers.length} antwoorden`);
    if (file.answers.length !== meta.count)
      errors.push(`${meta.id}: index zegt ${meta.count}, bestand ${file.answers.length}`);
    if (new Set(file.ids).size !== file.ids.length) errors.push(`${meta.id}: dubbele Wikidata-id`);
    for (let i = 1; i < file.answers.length; i++) {
      if (file.answers[i]![1] > file.answers[i - 1]![1]) {
        errors.push(`${meta.id}: niet gesorteerd op bekendheid (positie ${i})`);
        break;
      }
    }
    // Elk antwoord moet via zijn eigen naam terug te vinden zijn.
    const answers = fromFile(file).answers;
    const matcher = new AnswerMatcher(answers);
    const lost = answers.filter((a, i) => {
      const m = matcher.match(a.name);
      return (
        !m ||
        normalize(answers[m.index]!.name) !== normalize(a.name) ||
        (m.index !== i && m.kind !== 'exact')
      );
    });
    if (lost.length > 0)
      errors.push(
        `${meta.id}: ${lost.length} antwoorden niet terug te vinden, bv. "${lost[0]!.name}"`,
      );
  }
  if (index.length < MIN_PROMPTS)
    errors.push(`Maar ${index.length} vragen (minimaal ${MIN_PROMPTS})`);
  return errors;
}

function main() {
  const index = JSON.parse(readFileSync(`${root}src/data/prompts.json`, 'utf8')) as PromptMeta[];
  const read = (id: string) =>
    JSON.parse(readFileSync(`${root}public/prompts/${id}.json`, 'utf8')) as PromptFile;
  const errors = validatePrompts(index, read);

  console.log('vraag                     antw.   #1   25%  50%  90%   voorbeeld obscuur');
  let total = 0;
  for (const meta of index) {
    try {
      const answers = fromFile(read(meta.id)).answers;
      total += answers.length;
      const at = (f: number) =>
        String(
          rarityOf(answers, Math.min(answers.length - 1, Math.floor(answers.length * f))).points,
        ).padStart(4);
      const deep = answers[Math.floor(answers.length * 0.9)]?.name ?? '';
      console.log(
        `${meta.id.padEnd(24)} ${String(answers.length).padStart(5)}  ${at(0)} ${at(0.25)} ${at(0.5)} ${at(0.9)}   ${deep}`,
      );
    } catch {
      // Al gemeld in de fouten.
    }
  }
  console.log(`\n${index.length} vragen, ${total} antwoorden in totaal.`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} fout(en):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Data is in orde.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
