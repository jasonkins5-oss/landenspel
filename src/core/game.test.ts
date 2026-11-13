import { describe, expect, it } from 'vitest';
import { countries, stats } from '../data';
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
  scoreEmoji,
  submitRound,
  totalScore,
} from './game';

describe('createGame', () => {
  it('begint zonder resultaten, met 7 statistieken', () => {
    const game = createGame('2026-11-13', stats);
    expect(game.results).toEqual([]);
    expect(game.puzzle).toHaveLength(ROUNDS_PER_PUZZLE);
    expect(isComplete(game)).toBe(false);
    expect(currentRoundIndex(game)).toBe(0);
  });
});

describe('submitRound', () => {
  it('voegt een resultaat toe en gaat naar de volgende ronde', () => {
    let game = createGame('2026-11-13', stats);
    const stat = currentStat(game)!;
    const best = Object.entries(stat.values).sort(([, a], [, b]) => b - a)[0]![0];
    game = submitRound(game, best, 3, countries);
    expect(game.results).toHaveLength(1);
    expect(game.results[0]!.score.total).toBe(1000);
    expect(currentRoundIndex(game)).toBe(1);
    expect(currentStat(game)).toBe(game.puzzle[1]);
  });

  it('werkt ook zonder keuze (tijd verlopen)', () => {
    const game = submitRound(createGame('2026-11-13', stats), null, 60, countries);
    expect(game.results[0]!.score.total).toBe(0);
    expect(game.results[0]!.score.timedOut).toBe(true);
  });

  it('is onveranderlijk: laat de vorige state intact', () => {
    const game = createGame('2026-11-13', stats);
    const next = submitRound(game, null, 60, countries);
    expect(game.results).toEqual([]);
    expect(next.results).toHaveLength(1);
  });

  it('weigert een ronde na het einde van de puzzel', () => {
    let game = createGame('2026-11-13', stats);
    for (let i = 0; i < ROUNDS_PER_PUZZLE; i++) {
      game = submitRound(game, null, 60, countries);
    }
    expect(isComplete(game)).toBe(true);
    expect(() => submitRound(game, null, 60, countries)).toThrow();
  });
});

describe('totalScore', () => {
  it('telt op tot maximaal 7000', () => {
    let game = createGame('2026-11-13', stats);
    for (const stat of game.puzzle) {
      const best = Object.entries(stat.values).sort(([, a], [, b]) => b - a)[0]![0];
      game = submitRound(game, best, 0, countries);
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
    let game = createGame('2026-11-13', stats);
    for (let i = 0; i < ROUNDS_PER_PUZZLE; i++) {
      game = submitRound(game, null, 60, countries);
    }
    expect(emojiGrid(game)).toBe('⬛⬛⬛⬛⬛⬛⬛');
  });
});

describe('restoreGame en toSavedRounds', () => {
  it('herstelt een half gespeelde puzzel met dezelfde scores', () => {
    let game = createGame('2026-11-13', stats);
    game = submitRound(game, 'NLD', 7, countries);
    game = submitRound(game, null, 60, countries);
    const restored = restoreGame('2026-11-13', stats, toSavedRounds(game));
    expect(restored.results.map((r) => r.score)).toEqual(game.results.map((r) => r.score));
    expect(currentRoundIndex(restored)).toBe(2);
  });

  it('negeert opgeslagen rondes die niet bij de puzzel passen', () => {
    const restored = restoreGame('2026-11-13', stats, [
      { statId: 'bestaat-niet', iso3: 'NLD', seconds: 1 },
    ]);
    expect(restored.results).toEqual([]);
  });
});
