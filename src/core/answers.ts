/** Antwoorddata van één vraag, zoals scripts/fetch-prompts.ts die wegschrijft. */

/** Compact antwoord in de JSON: [naam, sitelinks, aliassen?]. */
export type AnswerTuple = [string, number, string[]?];

export interface PromptFile {
  id: string;
  prompt: string;
  /** Wikidata-id per antwoord, in dezelfde volgorde als `answers`. */
  ids: string[];
  /** Gesorteerd van bekend naar onbekend. */
  answers: AnswerTuple[];
}

/** Eén vraag in de index (src/data/prompts.json). */
export interface PromptMeta {
  id: string;
  prompt: string;
  count: number;
}

export interface Answer {
  /** Wikidata-id, bv. "Q38280". Stabiel: hierop tellen we spelersantwoorden. */
  id: string;
  name: string;
  aliases: string[];
  /** Aantal Wikipedia-edities met een artikel: maat voor bekendheid. */
  sitelinks: number;
}

export interface PromptAnswers {
  id: string;
  prompt: string;
  /** Van bekend naar onbekend. */
  answers: Answer[];
}

export function fromFile(file: PromptFile): PromptAnswers {
  return {
    id: file.id,
    prompt: file.prompt,
    answers: file.answers.map(([name, sitelinks, aliases], i) => ({
      id: file.ids[i]!,
      name,
      sitelinks,
      aliases: aliases ?? [],
    })),
  };
}
