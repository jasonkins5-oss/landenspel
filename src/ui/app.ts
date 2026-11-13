import type { Category } from '../data/types';
import { Matcher } from '../core/match';
import {
  createGame,
  currentStat,
  isComplete,
  puzzleKey,
  restoreGame,
  submitRound,
  toSavedRounds,
  totalScore,
  type GameMode,
  type GameState,
  type PuzzleRef,
} from '../core/game';
import {
  hasSeenIntro,
  type KeyValueStore,
  loadProgress,
  loadStats,
  markIntroSeen,
  recordCompletion,
  recordUnlimitedCompletion,
  saveProgress,
  saveStats,
} from '../core/storage';
import { renderCategoryScreen, type CategoryStatus } from './category-screen';
import { renderIntroScreen } from './intro-screen';
import { renderRoundScreen, type RoundScreenHandle } from './round-screen';
import { renderRevealScreen } from './reveal-screen';
import { renderEndScreen } from './end-screen';

export interface AppOptions {
  root: HTMLElement;
  categories: readonly Category[];
  dateKey: string;
  store: KeyValueStore;
  /** Knop in de header die de uitleg opent; optioneel. */
  helpButton?: HTMLElement | null;
  /** Categorie om direct mee te beginnen (uit de URL); anders het keuzescherm. */
  initialCategory?: Category | null;
  /** Onbeperkte puzzel om direct mee te beginnen (`?game=N`); vereist initialCategory. */
  initialGameNumber?: number | null;
  /** Wordt aangeroepen als de gekozen puzzel wisselt, zodat de URL mee kan veranderen. */
  onPuzzleChange?: (category: Category | null, ref: PuzzleRef | null) => void;
  /** Geeft de deelbare link voor een onbeperkte puzzel. */
  shareUrlFor?: (category: Category, ref: PuzzleRef) => string;
}

/** De onbeperkte reeks begint per categorie bij #1, zodat spelers dezelfde nummers delen. */
const FIRST_UNLIMITED_GAME = 1;

/**
 * Drijft keuzescherm → (ronde → onthulling → …) → eindscherm aan en bewaart de voortgang per
 * categorie en modus na elke stap. Bij herladen gaat het spel verder waar het was; een al
 * voltooide dagpuzzel toont direct het eindscherm, een voltooide onbeperkte puzzel ook (met
 * "Volgende puzzel").
 */
export function startApp(options: AppOptions): void {
  const { root, categories, dateKey, store } = options;
  let activeRound: RoundScreenHandle | null = null;
  let mode: GameMode = options.initialGameNumber ? 'unlimited' : 'daily';
  /** Het scherm waarnaar de help-knop terugkeert. */
  let resume: () => void = () => showCategories();

  function mount(el: HTMLElement) {
    activeRound?.destroy();
    activeRound = null;
    root.replaceChildren(el);
  }

  /** De puzzel die een categorie in deze modus nu "aan de beurt" heeft. */
  function currentRef(category: Category, forMode: GameMode): PuzzleRef {
    if (forMode === 'daily') return { mode: 'daily', dateKey };
    const saved = loadProgress(store, category.id, { mode: 'unlimited', number: 0 });
    if (!saved) return { mode: 'unlimited', number: FIRST_UNLIMITED_GAME };
    // Een afgeronde puzzel: de volgende staat klaar.
    const number = Number(saved.puzzleKey);
    const done = restoreGame(category, { mode: 'unlimited', number }, saved.rounds);
    return { mode: 'unlimited', number: isComplete(done) ? number + 1 : number };
  }

  function loadGame(
    category: Category,
    ref: PuzzleRef,
  ): { game: GameState; roundStartedAt: number | null; fresh: boolean } {
    const saved = loadProgress(store, category.id, ref);
    const game = saved ? restoreGame(category, ref, saved.rounds) : createGame(category, ref);
    // Een opgeslagen starttijd geldt alleen voor de ronde die nog open stond.
    const roundStartedAt =
      saved && saved.rounds.length === game.results.length ? saved.roundStartedAt : null;
    return { game, roundStartedAt, fresh: !saved };
  }

  function statusOf(category: Category, forMode: GameMode): CategoryStatus {
    const ref = currentRef(category, forMode);
    const { game } = loadGame(category, ref);
    return {
      roundsPlayed: game.results.length,
      totalRounds: game.puzzle.length,
      score: totalScore(game),
      puzzleNumber: ref.mode === 'unlimited' ? ref.number : undefined,
    };
  }

  function showCategories() {
    resume = showCategories;
    options.onPuzzleChange?.(null, null);
    mount(
      renderCategoryScreen({
        categories,
        mode,
        statusOf,
        onSelect: (category, forMode) => play(category, currentRef(category, forMode)),
        onModeChange: (next) => {
          mode = next;
          showCategories();
        },
      }),
    );
  }

  function showHelp() {
    mount(renderIntroScreen({ buttonLabel: 'Terug naar het spel', onContinue: () => resume() }));
  }

  function play(category: Category, ref: PuzzleRef) {
    mode = ref.mode;
    options.onPuzzleChange?.(category, ref);
    const matcher = new Matcher(category.items);
    const loaded = loadGame(category, ref);
    const fresh = loaded.fresh;
    let { game, roundStartedAt } = loaded;

    function persist() {
      saveProgress(store, category.id, ref.mode, {
        version: 2,
        puzzleKey: puzzleKey(ref),
        rounds: toSavedRounds(game),
        roundStartedAt,
      });
    }

    function recordStats() {
      const stats = loadStats(store, category.id);
      const score = totalScore(game);
      saveStats(
        store,
        category.id,
        ref.mode === 'daily'
          ? recordCompletion(stats, ref.dateKey, score)
          : recordUnlimitedCompletion(stats, score),
      );
    }

    function showRound() {
      const stat = currentStat(game);
      if (!stat) {
        showEnd();
        return;
      }
      resume = showRound;
      if (roundStartedAt === null) {
        roundStartedAt = Date.now();
        persist();
      }
      const handle = renderRoundScreen({
        roundNumber: game.results.length + 1,
        totalRounds: game.puzzle.length,
        question: stat.question,
        matcher,
        placeholder: category.placeholder,
        startedAt: roundStartedAt,
        onSubmit: (answerId, seconds) => {
          game = submitRound(game, answerId, seconds);
          roundStartedAt = null;
          if (isComplete(game)) recordStats();
          persist();
          showReveal();
        },
      });
      activeRound?.destroy();
      activeRound = handle;
      root.replaceChildren(handle.el);
    }

    function showReveal() {
      resume = showReveal;
      const result = game.results[game.results.length - 1]!;
      mount(
        renderRevealScreen({
          result,
          items: category.items,
          noun: category.noun,
          isLastRound: isComplete(game),
          onNext: () => (isComplete(game) ? showEnd() : showRound()),
        }),
      );
    }

    function showEnd() {
      resume = showEnd;
      mount(
        renderEndScreen({
          game,
          stats: loadStats(store, category.id),
          onOtherCategory: showCategories,
          onNextPuzzle:
            ref.mode === 'unlimited'
              ? () => play(category, { mode: 'unlimited', number: ref.number + 1 })
              : undefined,
          shareUrl: ref.mode === 'unlimited' ? options.shareUrlFor?.(category, ref) : undefined,
        }),
      );
    }

    if (isComplete(game)) showEnd();
    else if (!fresh && game.results.length > 0 && roundStartedAt === null) showReveal();
    else showRound();
  }

  options.helpButton?.addEventListener('click', showHelp);

  const start = () => {
    const { initialCategory, initialGameNumber } = options;
    if (initialCategory && initialGameNumber)
      play(initialCategory, { mode: 'unlimited', number: initialGameNumber });
    else if (initialCategory) play(initialCategory, { mode: 'daily', dateKey });
    else showCategories();
  };

  // Eerste bezoek: eerst de uitleg. De timer van ronde 1 start pas daarna.
  if (!hasSeenIntro(store)) {
    mount(
      renderIntroScreen({
        buttonLabel: 'Start',
        onContinue: () => {
          markIntroSeen(store);
          start();
        },
      }),
    );
  } else {
    start();
  }
}
