import { describe, expect, it } from 'vitest';
import { PROMPTS } from './fixtures';
import { ROUNDS_PER_PUZZLE } from './puzzle';
import {
  MAX_TOTAL_SCORE,
  addResult,
  createGame,
  currentPrompt,
  currentRoundIndex,
  emojiGrid,
  isComplete,
  puzzleKey,
  puzzleSeed,
  restoreGame,
  timedOutResult,
  totalScore,
  type GameState,
  type PuzzleRef,
} from './game';

const day: PuzzleRef = { mode: 'daily', dateKey: '2026-11-13' };
const answer = (game: GameState, points: number) =>
  addResult(game, {
    promptId: currentPrompt(game)!.id,
    answerId: 'Q1',
    answer: 'Something',
    points,
    rarerThan: 0.5,
  });

describe('puzzleSeed en puzzleKey', () => {
  it('geeft archief en dagpuzzel van dezelfde datum dezelfde vragen', () => {
    const archive: PuzzleRef = { mode: 'archive', dateKey: '2026-11-13' };
    expect(puzzleSeed(archive)).toBe(puzzleSeed(day));
    expect(createGame(archive, PROMPTS).puzzle).toEqual(createGame(day, PROMPTS).puzzle);
    expect(puzzleKey(archive)).toBe('2026-11-13');
  });

  it('nummert dives apart', () => {
    const dive: PuzzleRef = { mode: 'unlimited', number: 42 };
    expect(puzzleSeed(dive)).toBe('dive:42');
    expect(puzzleKey(dive)).toBe('42');
  });
});

describe('spelverloop', () => {
  it('begint leeg en loopt door de 7 vragen', () => {
    let game = createGame(day, PROMPTS);
    expect(currentRoundIndex(game)).toBe(0);
    for (let i = 0; i < ROUNDS_PER_PUZZLE; i++) game = answer(game, 1000);
    expect(isComplete(game)).toBe(true);
    expect(totalScore(game)).toBe(MAX_TOTAL_SCORE);
    expect(currentPrompt(game)).toBeUndefined();
    expect(() => answer(game, 100)).toThrow();
  });

  it('is onveranderlijk en klemt punten tussen 0 en 1000', () => {
    const game = createGame(day, PROMPTS);
    const next = answer(game, 5000);
    expect(game.results).toEqual([]);
    expect(next.results[0]!.points).toBe(1000);
    expect(answer(game, -5).results[0]!.points).toBe(0);
  });

  it('weigert een resultaat voor de verkeerde vraag', () => {
    const game = createGame(day, PROMPTS);
    expect(() => addResult(game, timedOutResult('bestaat-niet'))).toThrow();
  });

  it('bouwt het emojiraster per tier', () => {
    let game = createGame(day, PROMPTS);
    game = addResult(game, timedOutResult(currentPrompt(game)!.id));
    game = answer(game, 150);
    game = answer(game, 950);
    expect(emojiGrid(game)).toBe('⬛🟫🟨');
  });
});

describe('restoreGame', () => {
  it('herstelt opgeslagen rondes met hun vastgelegde punten', () => {
    let game = createGame(day, PROMPTS);
    game = answer(game, 420);
    game = addResult(game, timedOutResult(currentPrompt(game)!.id));
    const restored = restoreGame(day, PROMPTS, game.results);
    expect(restored.results).toEqual(game.results);
    expect(currentRoundIndex(restored)).toBe(2);
  });

  it('stopt bij een ronde die niet bij de puzzel past', () => {
    const restored = restoreGame(day, PROMPTS, [timedOutResult('bestaat-niet')]);
    expect(restored.results).toEqual([]);
  });
});
