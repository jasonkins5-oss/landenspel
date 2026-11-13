/**
 * Opslag in localStorage. Alle toegang zit in try/catch: zonder opslag (privémodus,
 * geblokkeerde site-data) werkt het spel gewoon, alleen zonder geheugen.
 *
 * Voortgang en statistieken worden per categorie bewaard, onder een sleutel met de
 * categorie-id erin. Versie 2: sinds de categorieën; oudere opslag wordt genegeerd.
 */

import type { CategoryId } from '../data/types';

export const STORAGE_VERSION = 2;
export const progressKey = (category: CategoryId) => `landenspel:progress:${category}`;
export const statsKey = (category: CategoryId) => `landenspel:stats:${category}`;

export interface SavedRound {
  statId: string;
  answerId: string | null;
  seconds: number;
}

/** Voortgang van één dag in één categorie. Oudere dagen worden overschreven. */
export interface SavedProgress {
  version: number;
  dateKey: string;
  rounds: SavedRound[];
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
  /** Datum van de laatst voltooide puzzel, als "YYYY-MM-DD". */
  lastCompleted: string | null;
}

export const EMPTY_STATS: PlayerStats = {
  version: STORAGE_VERSION,
  played: 0,
  totalScore: 0,
  best: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastCompleted: null,
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

/** Geeft de opgeslagen voortgang van deze dag en categorie, of null als er niets (bruikbaars) staat. */
export function loadProgress(store: KeyValueStore, category: CategoryId, dateKey: string): SavedProgress | null {
  const saved = readJson<SavedProgress>(store, progressKey(category));
  if (!saved || saved.version !== STORAGE_VERSION || saved.dateKey !== dateKey) return null;
  if (!Array.isArray(saved.rounds)) return null;
  return saved;
}

export function saveProgress(store: KeyValueStore, category: CategoryId, progress: SavedProgress): void {
  writeJson(store, progressKey(category), progress);
}

export function loadStats(store: KeyValueStore, category: CategoryId): PlayerStats {
  const saved = readJson<PlayerStats>(store, statsKey(category));
  if (!saved || saved.version !== STORAGE_VERSION) return EMPTY_STATS;
  return { ...EMPTY_STATS, ...saved };
}

export function saveStats(store: KeyValueStore, category: CategoryId, stats: PlayerStats): void {
  writeJson(store, statsKey(category), stats);
}

function dayDifference(fromKey: string, toKey: string): number {
  const ms = Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Werkt de statistieken bij na een voltooide puzzel. De streak loopt door als de vorige
 * voltooide puzzel precies gisteren was; dezelfde dag nog eens telt niet dubbel.
 */
export function recordCompletion(stats: PlayerStats, dateKey: string, score: number): PlayerStats {
  if (stats.lastCompleted === dateKey) return stats;
  const consecutive = stats.lastCompleted !== null && dayDifference(stats.lastCompleted, dateKey) === 1;
  const currentStreak = consecutive ? stats.currentStreak + 1 : 1;
  return {
    version: STORAGE_VERSION,
    played: stats.played + 1,
    totalScore: stats.totalScore + score,
    best: Math.max(stats.best, score),
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastCompleted: dateKey,
  };
}

/** De huidige streak, bekeken vanaf `todayKey`: vervalt als gisteren én vandaag ontbreken. */
export function effectiveStreak(stats: PlayerStats, todayKey: string): number {
  if (stats.lastCompleted === null) return 0;
  const gap = dayDifference(stats.lastCompleted, todayKey);
  return gap <= 1 ? stats.currentStreak : 0;
}

export const INTRO_KEY = 'landenspel:intro-gezien';

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
    const probe = '__landenspel_probe__';
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
