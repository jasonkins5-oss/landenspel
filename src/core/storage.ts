/**
 * Opslag in localStorage. Alle toegang zit in try/catch: zonder opslag (privémodus,
 * geblokkeerde site-data) werkt het spel gewoon, alleen zonder geheugen.
 *
 * Versie 3 (CORE DIVE): andere sleutels dan versie 1 en 2, dus oude opslag wordt genegeerd.
 */

import type { GameMode, PuzzleRef, RoundResult } from './game';

export const STORAGE_VERSION = 3;
export const progressKey = (mode: GameMode) => `coredive:progress:${mode}`;
export const STATS_KEY = 'coredive:stats';
export const HISTORY_KEY = 'coredive:history';
export const INTRO_KEY = 'coredive:intro-seen';

/** Voortgang van één puzzel per modus. Een nieuwere puzzel in dezelfde modus overschrijft de vorige. */
export interface SavedProgress {
  version: number;
  /** "2026-11-13" (dag- of archiefpuzzel) of "42" (dive #42). */
  puzzleKey: string;
  results: RoundResult[];
  /** Epoch-ms waarop de lopende ronde begon, zodat herladen de timer niet terugzet. */
  roundStartedAt: number | null;
}

export interface PlayerStats {
  version: number;
  played: number;
  totalScore: number;
  best: number;
  currentStreak: number;
  longestStreak: number;
  /** Datum van de laatst voltooide dagpuzzel, als "YYYY-MM-DD". */
  lastCompleted: string | null;
  /** Onbeperkte modus: telt niet mee voor de streak. */
  unlimitedPlayed: number;
  unlimitedTotalScore: number;
  unlimitedBest: number;
}

export const EMPTY_STATS: PlayerStats = {
  version: STORAGE_VERSION,
  played: 0,
  totalScore: 0,
  best: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastCompleted: null,
  unlimitedPlayed: 0,
  unlimitedTotalScore: 0,
  unlimitedBest: 0,
};

/** Minimale interface, zodat tests een in-memory store kunnen meegeven. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function readJson<T>(store: KeyValueStore, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Opslag vol of geblokkeerd: negeren.
  }
}

/**
 * Geeft de opgeslagen voortgang van deze puzzel, of null als er niets (bruikbaars) staat.
 * Met `ref.mode === 'unlimited'` en `number: 0` geeft het de laatst gespeelde dive terug,
 * ongeacht het nummer; zo kan de app daar verdergaan.
 */
export function loadProgress(store: KeyValueStore, ref: PuzzleRef): SavedProgress | null {
  const saved = readJson<SavedProgress>(store, progressKey(ref.mode));
  if (!saved || saved.version !== STORAGE_VERSION || !Array.isArray(saved.results)) return null;
  const wanted =
    ref.mode !== 'unlimited'
      ? ref.dateKey
      : ref.number === 0
        ? saved.puzzleKey
        : String(ref.number);
  return saved.puzzleKey === wanted ? saved : null;
}

export function saveProgress(store: KeyValueStore, mode: GameMode, progress: SavedProgress): void {
  writeJson(store, progressKey(mode), progress);
}

export function loadStats(store: KeyValueStore): PlayerStats {
  const saved = readJson<PlayerStats>(store, STATS_KEY);
  if (!saved || saved.version !== STORAGE_VERSION) return EMPTY_STATS;
  return { ...EMPTY_STATS, ...saved };
}

export function saveStats(store: KeyValueStore, stats: PlayerStats): void {
  writeJson(store, STATS_KEY, stats);
}

function dayDifference(fromKey: string, toKey: string): number {
  const ms = Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Werkt de statistieken bij na een voltooide dagpuzzel. De streak loopt door als de vorige
 * voltooide puzzel precies gisteren was; dezelfde dag nog eens telt niet dubbel.
 */
export function recordCompletion(stats: PlayerStats, dateKey: string, score: number): PlayerStats {
  if (stats.lastCompleted === dateKey) return stats;
  const consecutive =
    stats.lastCompleted !== null && dayDifference(stats.lastCompleted, dateKey) === 1;
  const currentStreak = consecutive ? stats.currentStreak + 1 : 1;
  return {
    ...stats,
    version: STORAGE_VERSION,
    played: stats.played + 1,
    totalScore: stats.totalScore + score,
    best: Math.max(stats.best, score),
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastCompleted: dateKey,
  };
}

/** Telt een voltooide dive op; de streak blijft onaangeroerd. */
export function recordUnlimitedCompletion(stats: PlayerStats, score: number): PlayerStats {
  return {
    ...stats,
    version: STORAGE_VERSION,
    unlimitedPlayed: stats.unlimitedPlayed + 1,
    unlimitedTotalScore: stats.unlimitedTotalScore + score,
    unlimitedBest: Math.max(stats.unlimitedBest, score),
  };
}

/** De huidige streak, bekeken vanaf `todayKey`: vervalt als gisteren én vandaag ontbreken. */
export function effectiveStreak(stats: PlayerStats, todayKey: string): number {
  if (stats.lastCompleted === null) return 0;
  const gap = dayDifference(stats.lastCompleted, todayKey);
  return gap <= 1 ? stats.currentStreak : 0;
}

/** Eindscores van voltooide dagpuzzels (vandaag of uit het archief), per datum. */
export type PuzzleHistory = Record<string, number>;

export function loadHistory(store: KeyValueStore): PuzzleHistory {
  const saved = readJson<{ version: number; scores: PuzzleHistory }>(store, HISTORY_KEY);
  if (!saved || saved.version !== STORAGE_VERSION || typeof saved.scores !== 'object') return {};
  return saved.scores ?? {};
}

/** Bewaart de eerste eindscore van een datum; een tweede keer spelen overschrijft niets. */
export function recordHistory(store: KeyValueStore, dateKey: string, score: number): void {
  const scores = loadHistory(store);
  if (dateKey in scores) return;
  writeJson(store, HISTORY_KEY, {
    version: STORAGE_VERSION,
    scores: { ...scores, [dateKey]: score },
  });
}

export function hasSeenIntro(store: KeyValueStore): boolean {
  try {
    return store.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(store: KeyValueStore): void {
  try {
    store.setItem(INTRO_KEY, '1');
  } catch {
    // Negeren.
  }
}

/** window.localStorage als die bruikbaar is, anders een store die niets onthoudt. */
export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const probe = '__coredive_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStore();
  }
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
