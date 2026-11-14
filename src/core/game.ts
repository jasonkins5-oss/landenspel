import type { PromptMeta } from './answers';
import { tierFor } from './depth';
import { getPuzzle, ROUNDS_PER_PUZZLE } from './puzzle';
import { MAX_POINTS } from './rarity';

/**
 * Welke puzzel: de dagpuzzel van vandaag, een genummerde dive uit de onbeperkte modus, of een
 * oude dagpuzzel uit het archief (dezelfde vragen als op die dag, maar zonder streak).
 */
export type PuzzleRef =
  | { mode: 'daily'; dateKey: string }
  | { mode: 'unlimited'; number: number }
  | { mode: 'archive'; dateKey: string };

export type GameMode = PuzzleRef['mode'];

/**
 * Resultaat van één ronde. De punten worden bij het indienen vastgelegd: ze hangen af van de
 * spelerstellingen op dat moment, en die veranderen later.
 */
export interface RoundResult {
  promptId: string;
  /** Wikidata-id van het antwoord; null = tijd op. */
  answerId: string | null;
  /** Naam van het antwoord zoals in onze lijst. */
  answer: string | null;
  points: number;
  /** 0–1: aandeel antwoorden dat vaker gegeven wordt. */
  rarerThan: number;
}

export interface GameState {
  ref: PuzzleRef;
  puzzle: PromptMeta[];
  results: RoundResult[];
}

/** Seed van een puzzel. Een archiefpuzzel heeft dezelfde seed als de dagpuzzel van die datum. */
export function puzzleSeed(ref: PuzzleRef): string {
  return ref.mode === 'unlimited' ? `dive:${ref.number}` : `day:${ref.dateKey}`;
}

/** Sleutel waaronder de voortgang van deze puzzel wordt herkend ("2026-11-13" of "42"). */
export function puzzleKey(ref: PuzzleRef): string {
  return ref.mode === 'unlimited' ? String(ref.number) : ref.dateKey;
}

export function createGame(ref: PuzzleRef, prompts: readonly PromptMeta[]): GameState {
  return { ref, puzzle: getPuzzle(puzzleSeed(ref), prompts), results: [] };
}

/**
 * Bouwt een spel opnieuw op uit opgeslagen rondes. Stopt bij de eerste ronde die niet bij de
 * puzzel past (bijvoorbeeld na een wijziging in de vragenlijst); de rest wordt genegeerd.
 */
export function restoreGame(
  ref: PuzzleRef,
  prompts: readonly PromptMeta[],
  saved: readonly RoundResult[],
): GameState {
  let game = createGame(ref, prompts);
  for (const round of saved) {
    if (currentPrompt(game)?.id !== round.promptId) break;
    game = addResult(game, round);
  }
  return game;
}

export function currentRoundIndex(game: GameState): number {
  return game.results.length;
}

export function isComplete(game: GameState): boolean {
  return game.results.length >= ROUNDS_PER_PUZZLE;
}

export function currentPrompt(game: GameState): PromptMeta | undefined {
  return game.puzzle[currentRoundIndex(game)];
}

/** Voegt het resultaat van de huidige ronde toe. Mag niet na het einde van de puzzel. */
export function addResult(game: GameState, result: RoundResult): GameState {
  const prompt = currentPrompt(game);
  if (!prompt) throw new Error('Puzzle is already complete');
  if (prompt.id !== result.promptId) throw new Error(`Expected prompt ${prompt.id}`);
  const points = Math.max(0, Math.min(MAX_POINTS, Math.round(result.points)));
  return { ...game, results: [...game.results, { ...result, points }] };
}

/** Tijd op: 0 punten. */
export function timedOutResult(promptId: string): RoundResult {
  return { promptId, answerId: null, answer: null, points: 0, rarerThan: 0 };
}

export function totalScore(game: GameState): number {
  return game.results.reduce((sum, r) => sum + r.points, 0);
}

export const MAX_TOTAL_SCORE = ROUNDS_PER_PUZZLE * MAX_POINTS;

export function emojiGrid(game: GameState): string {
  return game.results.map((r) => tierFor(r.points).emoji).join('');
}
