import { describe, expect, it } from 'vitest';
import type { PuzzleRef } from './game';
import {
  EMPTY_STATS,
  STATS_KEY,
  effectiveStreak,
  hasSeenIntro,
  loadHistory,
  loadProgress,
  loadStats,
  markIntroSeen,
  memoryStore,
  progressKey,
  recordCompletion,
  recordHistory,
  recordUnlimitedCompletion,
  saveProgress,
  saveStats,
  type SavedProgress,
} from './storage';

const day: PuzzleRef = { mode: 'daily', dateKey: '2026-11-13' };
const progress: SavedProgress = {
  version: 3,
  puzzleKey: '2026-11-13',
  results: [
    { promptId: 'dog-breed', answerId: 'Q38978', answer: 'Pumi', points: 912, rarerThan: 0.95 },
  ],
  roundStartedAt: 1_000,
};

describe('voortgang', () => {
  it('slaat op en leest terug per modus en puzzel', () => {
    const store = memoryStore();
    saveProgress(store, 'daily', progress);
    expect(loadProgress(store, day)).toEqual(progress);
    expect(loadProgress(store, { mode: 'daily', dateKey: '2026-11-14' })).toBeNull();
    expect(loadProgress(store, { mode: 'archive', dateKey: '2026-11-13' })).toBeNull();
  });

  it('vindt de laatst gespeelde dive met nummer 0', () => {
    const store = memoryStore();
    const dive = { ...progress, puzzleKey: '42' };
    saveProgress(store, 'unlimited', dive);
    expect(loadProgress(store, { mode: 'unlimited', number: 42 })).toEqual(dive);
    expect(loadProgress(store, { mode: 'unlimited', number: 43 })).toBeNull();
    expect(loadProgress(store, { mode: 'unlimited', number: 0 })).toEqual(dive);
  });

  it('negeert een andere versie of kapotte JSON', () => {
    const store = memoryStore();
    store.setItem(progressKey('daily'), JSON.stringify({ ...progress, version: 2 }));
    expect(loadProgress(store, day)).toBeNull();
    store.setItem(progressKey('daily'), '{kapot');
    expect(loadProgress(store, day)).toBeNull();
  });

  it('overleeft een store die gooit', () => {
    const broken = {
      getItem: () => {
        throw new Error('geblokkeerd');
      },
      setItem: () => {
        throw new Error('geblokkeerd');
      },
      removeItem: () => {},
    };
    expect(() => saveProgress(broken, 'daily', progress)).not.toThrow();
    expect(loadProgress(broken, day)).toBeNull();
    expect(loadStats(broken)).toEqual(EMPTY_STATS);
    expect(hasSeenIntro(broken)).toBe(false);
  });
});

describe('statistieken en streak', () => {
  it('vult ontbrekende velden aan', () => {
    const store = memoryStore();
    store.setItem(STATS_KEY, JSON.stringify({ version: 3, played: 3 }));
    expect(loadStats(store)).toEqual({ ...EMPTY_STATS, played: 3 });
  });

  it('laat de streak doorlopen en breekt bij een gat', () => {
    let s = recordCompletion(EMPTY_STATS, '2026-11-13', 1000);
    s = recordCompletion(s, '2026-11-14', 2000);
    expect(recordCompletion(s, '2026-11-14', 9999)).toBe(s);
    expect(s).toMatchObject({ played: 2, currentStreak: 2, best: 2000 });
    s = recordCompletion(s, '2026-11-16', 500);
    expect(s).toMatchObject({ currentStreak: 1, longestStreak: 2 });
    expect(effectiveStreak(s, '2026-11-17')).toBe(1);
    expect(effectiveStreak(s, '2026-11-18')).toBe(0);
    const store = memoryStore();
    saveStats(store, s);
    expect(loadStats(store)).toEqual(s);
  });

  it('houdt dives apart van de streak', () => {
    let s = recordCompletion(EMPTY_STATS, '2026-11-13', 1000);
    s = recordUnlimitedCompletion(s, 3000);
    expect(s).toMatchObject({
      played: 1,
      currentStreak: 1,
      unlimitedPlayed: 1,
      unlimitedBest: 3000,
    });
  });
});

describe('geschiedenis en intro', () => {
  it('onthoudt de eerste eindscore per datum', () => {
    const store = memoryStore();
    recordHistory(store, '2026-11-13', 4200);
    recordHistory(store, '2026-11-13', 7000);
    expect(loadHistory(store)).toEqual({ '2026-11-13': 4200 });
  });

  it('onthoudt dat de uitleg gezien is', () => {
    const store = memoryStore();
    expect(hasSeenIntro(store)).toBe(false);
    markIntroSeen(store);
    expect(hasSeenIntro(store)).toBe(true);
  });
});
