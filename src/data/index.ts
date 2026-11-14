import promptsJson from './prompts.json';
import { fromFile, type PromptAnswers, type PromptFile, type PromptMeta } from '../core/answers';

/**
 * De index van alle vragen (gegenereerd door `npm run data:fetch`). De antwoorden per vraag
 * staan in public/prompts/<id>.json en worden pas geladen als een puzzel ze nodig heeft.
 */
export const prompts = promptsJson as PromptMeta[];

const cache = new Map<string, Promise<PromptAnswers>>();

/** Laadt de antwoorden van één vraag; elke vraag wordt maar één keer opgehaald. */
export function loadAnswers(id: string): Promise<PromptAnswers> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}prompts/${encodeURIComponent(id)}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load prompt ${id} (${res.status})`);
        return res.json() as Promise<PromptFile>;
      })
      .then(fromFile);
    // Bij een fout de cache leegmaken, zodat een volgende poging opnieuw ophaalt.
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}
