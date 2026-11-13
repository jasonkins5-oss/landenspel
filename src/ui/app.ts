import type { Country, Stat } from '../data/types';
import { CountryMatcher } from '../core/match';
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
import { renderIntroScreen } from './intro-screen';
import { renderRoundScreen, type RoundScreenHandle } from './round-screen';
import { renderRevealScreen } from './reveal-screen';
import { renderEndScreen } from './end-screen';

export interface AppOptions {
  root: HTMLElement;
  countries: readonly Country[];
  stats: readonly Stat[];
  dateKey: string;
  store: KeyValueStore;
  /** Knop in de header die de uitleg opent; optioneel. */
  helpButton?: HTMLElement | null;
}

/**
 * Drijft de state machine ronde → onthulling → … → eindscherm aan en bewaart de
 * voortgang na elke stap. Bij herladen gaat het spel verder waar het was; een al
 * voltooide puzzel van vandaag toont direct het eindscherm.
 */
export function startApp(options: AppOptions): void {
  const { root, countries, stats, dateKey, store } = options;
  const matcher = new CountryMatcher(countries);
  let activeRound: RoundScreenHandle | null = null;

  const saved = loadProgress(store, dateKey);
  let game: GameState = saved ? restoreGame(dateKey, stats, saved.rounds) : createGame(dateKey, stats);
  // Een opgeslagen starttijd geldt alleen voor de ronde die nog open stond.
  let roundStartedAt: number | null =
    saved && saved.rounds.length === game.results.length ? saved.roundStartedAt : null;

  function persist() {
    saveProgress(store, {
      version: 1,
      dateKey,
      rounds: toSavedRounds(game),
      roundStartedAt,
    });
  }

  function mount(el: HTMLElement) {
    activeRound?.destroy();
    activeRound = null;
    root.replaceChildren(el);
  }

  /** Het scherm waarnaar de help-knop terugkeert. */
  let resume: () => void = () => showRound();

  function showHelp() {
    mount(renderIntroScreen({ buttonLabel: 'Terug naar het spel', onContinue: () => resume() }));
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
      startedAt: roundStartedAt,
      onSubmit: (iso3, seconds) => {
        game = submitRound(game, iso3, seconds, countries);
        roundStartedAt = null;
        if (isComplete(game)) {
          saveStats(store, recordCompletion(loadStats(store), dateKey, totalScore(game)));
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
        countries,
        isLastRound: isComplete(game),
        onNext: () => (isComplete(game) ? showEnd() : showRound()),
      }),
    );
  }

  function showEnd() {
    resume = showEnd;
    mount(renderEndScreen({ game, stats: loadStats(store) }));
  }

  function start() {
    if (isComplete(game)) showEnd();
    else if (saved && game.results.length > 0 && roundStartedAt === null) showReveal();
    else showRound();
  }

  options.helpButton?.addEventListener('click', showHelp);

  // Eerste bezoek: eerst de uitleg. De timer van ronde 1 start pas na "Start".
  if (!hasSeenIntro(store) && game.results.length === 0) {
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
