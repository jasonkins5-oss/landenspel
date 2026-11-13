import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATS,
  effectiveStreak,
  loadProgress,
  loadStats,
  memoryStore,
  progressKey,
  recordCompletion,
  saveProgress,
  saveStats,
  statsKey,
  type SavedProgress,
} from './storage';

const progress: SavedProgress = {
  version: 2,
  dateKey: '2026-11-13',
  rounds: [{ statId: 'population', answerId: 'IND', seconds: 4 }],
  roundStartedAt: 1_000,
};

describe('voortgang', () => {
  it('slaat op en leest terug voor dezelfde dag en categorie', () => {
    const store = memoryStore();
    saveProgress(store, 'landen', progress);
    expect(loadProgress(store, 'landen', '2026-11-13')).toEqual(progress);
    expect(loadProgress(store, 'dieren', '2026-11-13')).toBeNull();
  });

  it('geeft null voor een andere dag, een andere versie of kapotte JSON', () => {
    const store = memoryStore();
    saveProgress(store, 'landen', progress);
    expect(loadProgress(store, 'landen', '2026-11-14')).toBeNull();
    store.setItem(progressKey('landen'), JSON.stringify({ ...progress, version: 99 }));
    expect(loadProgress(store, 'landen', '2026-11-13')).toBeNull();
    store.setItem(progressKey('landen'), '{niet json');
    expect(loadProgress(store, 'landen', '2026-11-13')).toBeNull();
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
    expect(() => saveProgress(broken, 'landen', progress)).not.toThrow();
    expect(loadProgress(broken, 'landen', '2026-11-13')).toBeNull();
    expect(loadStats(broken, 'landen')).toEqual(EMPTY_STATS);
  });
});

describe('statistieken en streak', () => {
  it('begint leeg en vult ontbrekende velden aan', () => {
    const store = memoryStore();
    expect(loadStats(store, 'sport')).toEqual(EMPTY_STATS);
    store.setItem(statsKey('sport'), JSON.stringify({ version: 2, played: 3 }));
    expect(loadStats(store, 'sport')).toEqual({ ...EMPTY_STATS, played: 3 });
    expect(loadStats(store, 'landen')).toEqual(EMPTY_STATS);
  });

  it('telt een voltooide puzzel op', () => {
    const s = recordCompletion(EMPTY_STATS, '2026-11-13', 4200);
    expect(s).toMatchObject({ played: 1, totalScore: 4200, best: 4200, currentStreak: 1, longestStreak: 1 });
    const store = memoryStore();
    saveStats(store, 'landen', s);
    expect(loadStats(store, 'landen')).toEqual(s);
  });

  it('telt dezelfde dag niet dubbel', () => {
    const s = recordCompletion(EMPTY_STATS, '2026-11-13', 4200);
    expect(recordCompletion(s, '2026-11-13', 9999)).toBe(s);
  });

  it('laat de streak doorlopen op opeenvolgende dagen en breekt bij een gat', () => {
    let s = recordCompletion(EMPTY_STATS, '2026-11-13', 1000);
    s = recordCompletion(s, '2026-11-14', 2000);
    s = recordCompletion(s, '2026-11-15', 3000);
    expect(s).toMatchObject({ currentStreak: 3, longestStreak: 3, best: 3000, totalScore: 6000 });
    s = recordCompletion(s, '2026-11-17', 500);
    expect(s).toMatchObject({ currentStreak: 1, longestStreak: 3, played: 4 });
  });

  it('werkt over een maandgrens heen', () => {
    let s = recordCompletion(EMPTY_STATS, '2026-11-30', 1);
    s = recordCompletion(s, '2026-12-01', 1);
    expect(s.currentStreak).toBe(2);
  });

  it('effectiveStreak vervalt als er een dag is overgeslagen', () => {
    const s = recordCompletion(EMPTY_STATS, '2026-11-13', 1);
    expect(effectiveStreak(s, '2026-11-13')).toBe(1);
    expect(effectiveStreak(s, '2026-11-14')).toBe(1);
    expect(effectiveStreak(s, '2026-11-15')).toBe(0);
    expect(effectiveStreak(EMPTY_STATS, '2026-11-15')).toBe(0);
  });
});

describe('intro', () => {
  it('onthoudt dat de uitleg gezien is', async () => {
    const { hasSeenIntro, markIntroSeen } = await import('./storage');
    const store = memoryStore();
    expect(hasSeenIntro(store)).toBe(false);
    markIntroSeen(store);
    expect(hasSeenIntro(store)).toBe(true);
  });
});
