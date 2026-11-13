import type { Category, Stat } from '../data/types';
import { getPuzzle, ROUNDS_PER_PUZZLE } from './puzzle';
import { type RoundScore, scoreRound } from './scoring';

export interface RoundResult {
  stat: Stat;
  /** Item-id van het antwoord; null = geen keuze ingediend (tijd verlopen). */
  answerId: string | null;
  seconds: number;
  score: RoundScore;
}

export type GameMode = 'daily' | 'unlimited';

/** Welke puzzel: de dagpuzzel van een datum, of een genummerde puzzel uit de onbeperkte modus. */
export type PuzzleRef = { mode: 'daily'; dateKey: string } | { mode: 'unlimited'; number: number };

export interface GameState {
  category: Category;
  ref: PuzzleRef;
  puzzle: Stat[];
  /** Resultaten van de voltooide rondes, in volgorde. */
  results: RoundResult[];
}

/** Seed van een puzzel. De dagpuzzel van Landen houdt de seed van versie 1. */
export function puzzleSeed(category: Pick<Category, 'id'>, ref: PuzzleRef): string {
  if (ref.mode === 'unlimited') return `${category.id}:onbeperkt:${ref.number}`;
  return category.id === 'landen' ? ref.dateKey : `${category.id}:${ref.dateKey}`;
}

/** Sleutel waaronder de voortgang van deze puzzel wordt herkend ("2026-11-13" of "42"). */
export function puzzleKey(ref: PuzzleRef): string {
  return ref.mode === 'daily' ? ref.dateKey : String(ref.number);
}

export function createGame(category: Category, ref: PuzzleRef): GameState {
  return { category, ref, puzzle: getPuzzle(puzzleSeed(category, ref), category.stats), results: [] };
}

export interface SavedRoundInput {
  statId: string;
  answerId: string | null;
  seconds: number;
}

/**
 * Bouwt een spel opnieuw op uit opgeslagen rondes. De score wordt opnieuw berekend
 * (die is deterministisch). Stopt zodra een opgeslagen ronde niet bij de puzzel past,
 * bijvoorbeeld na een datawijziging; de rest wordt dan genegeerd.
 */
export function restoreGame(category: Category, ref: PuzzleRef, saved: readonly SavedRoundInput[]): GameState {
  let game = createGame(category, ref);
  for (const round of saved) {
    const stat = currentStat(game);
    if (!stat || stat.id !== round.statId) break;
    game = submitRound(game, round.answerId, round.seconds);
  }
  return game;
}

export function toSavedRounds(game: GameState): SavedRoundInput[] {
  return game.results.map((r) => ({ statId: r.stat.id, answerId: r.answerId, seconds: r.seconds }));
}

export function currentRoundIndex(game: GameState): number {
  return game.results.length;
}

export function isComplete(game: GameState): boolean {
  return game.results.length >= ROUNDS_PER_PUZZLE;
}

export function currentStat(game: GameState): Stat | undefined {
  return game.puzzle[currentRoundIndex(game)];
}

/** Scoort de huidige ronde en voegt het resultaat toe. Mag niet worden aangeroepen als de puzzel al klaar is. */
export function submitRound(game: GameState, answerId: string | null, seconds: number): GameState {
  const stat = currentStat(game);
  if (!stat) throw new Error('Puzzel is al afgerond');
  const score = scoreRound(stat, answerId, seconds);
  const result: RoundResult = { stat, answerId, seconds, score };
  return { ...game, results: [...game.results, result] };
}

export function totalScore(game: GameState): number {
  return game.results.reduce((sum, r) => sum + r.score.total, 0);
}

export const MAX_TOTAL_SCORE = ROUNDS_PER_PUZZLE * 1000;

/** Emoji-raster voor de deeltekst: 🟩 ≥ 800, 🟨 ≥ 400, 🟧 > 0, ⬛ 0. */
export function scoreEmoji(total: number): string {
  if (total >= 800) return '🟩';
  if (total >= 400) return '🟨';
  if (total > 0) return '🟧';
  return '⬛';
}

export function emojiGrid(game: GameState): string {
  return game.results.map((r) => scoreEmoji(r.score.total)).join('');
}
