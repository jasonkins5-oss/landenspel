import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PromptFile, PromptMeta } from '../core/answers';
import { validatePrompts } from '../../scripts/validate-prompts';
import { prompts } from './index';

const publicDir = fileURLToPath(new URL('../../public/prompts/', import.meta.url));
const read = (id: string) =>
  JSON.parse(readFileSync(`${publicDir}${id}.json`, 'utf8')) as PromptFile;

describe('vragen en antwoorden', () => {
  it('doorstaan de validatie (genoeg vragen, genoeg antwoorden, alles terug te vinden)', () => {
    expect(validatePrompts(prompts as PromptMeta[], read)).toEqual([]);
  });

  it('kennen gangbare antwoorden op een paar bekende vragen', async () => {
    const { fromFile } = await import('../core/answers');
    const { AnswerMatcher } = await import('../core/match');
    const check = (id: string, text: string) => {
      const answers = fromFile(read(id)).answers;
      return new AnswerMatcher(answers).match(text) !== null;
    };
    expect(check('dog-breed', 'labrador')).toBe(true);
    expect(check('dog-breed', 'pumi')).toBe(true);
    expect(check('cheese', 'gouda')).toBe(true);
    expect(check('element', 'oxygen')).toBe(true);
    expect(check('country', 'netherlands')).toBe(true);
    expect(check('cheese', 'labrador')).toBe(false);
  });
});
