import type { Category } from '../data/types';
import { Matcher } from '../core/match';
import {
  createGame,
  currentStat,
  isComplete,
  restoreGame,
  submitRound,
  toSavedRounds,
  totalScore,
  type GameState,
} from '../core/game';
import {
  hasSeenIntro,
  type KeyValueStore,
  loadProgress,
  loadStats,
  markIntroSeen,
  recordCompletion,
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
  /** Wordt aangeroepen als de gekozen categorie wisselt, zodat de URL mee kan veranderen. */
  onCategoryChange?: (category: Category | null) => void;
}

/**
 * Drijft keuzescherm → (ronde → onthulling → …) → eindscherm aan en bewaart de voortgang per
 * categorie na elke stap. Bij herladen gaat het spel verder waar het was; een al voltooide
 * puzzel van vandaag toont direct het eindscherm.
 */
export function startApp(options: AppOptions): void {
  const { root, categories, dateKey, store } = options;
  let activeRound: RoundScreenHandle | null = null;
  /** Het scherm waarnaar de help-knop terugkeert. */
  let resume: () => void = () => showCategories();

  function mount(el: HTMLElement) {
    activeRound?.destroy();
    activeRound = null;
    root.replaceChildren(el);
  }

  function loadGame(category: Category): { game: GameState; roundStartedAt: number | null; fresh: boolean } {
    const saved = loadProgress(store, category.id, dateKey);
    const game = saved ? restoreGame(category, dateKey, saved.rounds) : createGame(category, dateKey);
    // Een opgeslagen starttijd geldt alleen voor de ronde die nog open stond.
    const roundStartedAt = saved && saved.rounds.length === game.results.length ? saved.roundStartedAt : null;
    return { game, roundStartedAt, fresh: !saved };
  }

  function statusOf(category: Category): CategoryStatus {
    const { game } = loadGame(category);
    return { roundsPlayed: game.results.length, totalRounds: game.puzzle.length, score: totalScore(game) };
  }

  function showCategories() {
    resume = showCategories;
    options.onCategoryChange?.(null);
    mount(renderCategoryScreen({ categories, statusOf, onSelect: play }));
  }

  function showHelp() {
    mount(renderIntroScreen({ buttonLabel: 'Terug naar het spel', onContinue: () => resume() }));
  }

  function play(category: Category) {
    options.onCategoryChange?.(category);
    const matcher = new Matcher(category.items);
    const loaded = loadGame(category);
    const fresh = loaded.fresh;
    let { game, roundStartedAt } = loaded;

    function persist() {
      saveProgress(store, category.id, {
        version: 2,
        dateKey,
        rounds: toSavedRounds(game),
        roundStartedAt,
      });
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
          if (isComplete(game)) {
            saveStats(store, category.id, recordCompletion(loadStats(store, category.id), dateKey, totalScore(game)));
          }
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
      mount(renderEndScreen({ game, stats: loadStats(store, category.id), onOtherCategory: showCategories }));
    }

    if (isComplete(game)) showEnd();
    else if (!fresh && game.results.length > 0 && roundStartedAt === null) showReveal();
    else showRound();
  }

  options.helpButton?.addEventListener('click', showHelp);

  const start = () => (options.initialCategory ? play(options.initialCategory) : showCategories());

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
