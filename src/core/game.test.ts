import { describe, expect, it } from 'vitest';
import { categories } from '../data';
import { ROUNDS_PER_PUZZLE } from './puzzle';
import {
  restoreGame,
  toSavedRounds,
  createGame,
  currentRoundIndex,
  currentStat,
  emojiGrid,
  isComplete,
  MAX_TOTAL_SCORE,
  puzzleKey,
  puzzleSeed,
  scoreEmoji,
  submitRound,
  totalScore,
  type PuzzleRef,
} from './game';

const landen = categories.find((c) => c.id === 'landen')!;
const dieren = categories.find((c) => c.id === 'dieren')!;
const day: PuzzleRef = { mode: 'daily', dateKey: '2026-11-13' };
const ids = (ref: PuzzleRef, category = dieren) =>
  createGame(category, ref).puzzle.map((s) => s.id);

describe('createGame', () => {
  it('begint zonder resultaten, met 7 statistieken', () => {
    const game = createGame(landen, day);
    expect(game.results).toEqual([]);
    expect(game.puzzle).toHaveLength(ROUNDS_PER_PUZZLE);
    expect(isComplete(game)).toBe(false);
    expect(currentRoundIndex(game)).toBe(0);
  });

  it('geeft elke categorie een eigen dagpuzzel; Landen houdt de seed van versie 1', () => {
    expect(puzzleSeed(landen, day)).toBe('2026-11-13');
    expect(puzzleSeed(dieren, day)).toBe('dieren:2026-11-13');
    expect(ids(day)).toEqual(ids(day));
    expect(ids({ mode: 'daily', dateKey: '2026-11-14' })).not.toEqual(ids(day));
  });

  it('onbeperkte puzzels zijn deterministisch per nummer en verschillen van de dagpuzzel', () => {
    const u42: PuzzleRef = { mode: 'unlimited', number: 42 };
    expect(puzzleSeed(dieren, u42)).toBe('dieren:onbeperkt:42');
    expect(puzzleKey(u42)).toBe('42');
    expect(puzzleKey(day)).toBe('2026-11-13');
    expect(ids(u42)).toEqual(ids(u42));
    expect(ids(u42)).not.toEqual(ids({ mode: 'unlimited', number: 43 }));
    expect(ids(u42, landen)).not.toEqual(ids(day, landen));
  });
});

describe('submitRound', () => {
  it('voegt een resultaat toe en gaat naar de volgende ronde', () => {
    let game = createGame(landen, day);
    const stat = currentStat(game)!;
    const best = Object.entries(stat.values).sort(([, a], [, b]) => b - a)[0]![0];
    game = submitRound(game, best, 3);
    expect(game.results).toHaveLength(1);
    expect(game.results[0]!.score.total).toBe(1000);
    expect(currentRoundIndex(game)).toBe(1);
    expect(currentStat(game)).toBe(game.puzzle[1]);
  });

  it('werkt ook zonder keuze (tijd verlopen)', () => {
    const game = submitRound(createGame(landen, day), null, 60);
    expect(game.results[0]!.score.total).toBe(0);
    expect(game.results[0]!.score.timedOut).toBe(true);
  });

  it('is onveranderlijk: laat de vorige state intact', () => {
    const game = createGame(landen, day);
    const next = submitRound(game, null, 60);
    expect(game.results).toEqual([]);
    expect(next.results).toHaveLength(1);
  });

  it('weigert een ronde na het einde van de puzzel', () => {
    let game = createGame(landen, day);
    for (let i = 0; i < ROUNDS_PER_PUZZLE; i++) {
      game = submitRound(game, null, 60);
    }
    expect(isComplete(game)).toBe(true);
    expect(() => submitRound(game, null, 60)).toThrow();
  });
});

describe('totalScore', () => {
  it('telt op tot maximaal 7000', () => {
    let game = createGame(dieren, { mode: 'unlimited', number: 7 });
    for (const stat of game.puzzle) {
      const best = Object.entries(stat.values).sort(([, a], [, b]) => b - a)[0]![0];
      game = submitRound(game, best, 0);
    }
    expect(totalScore(game)).toBe(MAX_TOTAL_SCORE);
  });
});

describe('scoreEmoji en emojiGrid', () => {
  it.each([
    [1000, '🟩'],
    [800, '🟩'],
    [799, '🟨'],
    [400, '🟨'],
    [399, '🟧'],
    [1, '🟧'],
    [0, '⬛'],
  ])('%s → %s', (score, emoji) => {
    expect(scoreEmoji(score)).toBe(emoji);
  });

  it('bouwt een raster van 7 tekens na een volledige puzzel', () => {
    let game = createGame(landen, day);
    for (let i = 0; i < ROUNDS_PER_PUZZLE; i++) {
      game = submitRound(game, null, 60);
    }
    expect(emojiGrid(game)).toBe('⬛⬛⬛⬛⬛⬛⬛');
  });
});

describe('restoreGame en toSavedRounds', () => {
  it('herstelt een half gespeelde puzzel met dezelfde scores', () => {
    let game = createGame(landen, day);
    game = submitRound(game, 'NLD', 7);
    game = submitRound(game, null, 60);
    const restored = restoreGame(landen, day, toSavedRounds(game));
    expect(restored.results.map((r) => r.score)).toEqual(game.results.map((r) => r.score));
    expect(currentRoundIndex(restored)).toBe(2);
  });

  it('negeert opgeslagen rondes die niet bij de puzzel passen', () => {
    const restored = restoreGame(landen, day, [
      { statId: 'bestaat-niet', answerId: 'NLD', seconds: 1 },
    ]);
    expect(restored.results).toEqual([]);
  });
});
