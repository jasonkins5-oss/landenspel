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
  loadHistory,
  loadProgress,
  loadStats,
  markIntroSeen,
  recordCompletion,
  recordHistory,
  recordUnlimitedCompletion,
  saveProgress,
  saveStats,
} from '../core/storage';
import { archiveDates, puzzleNumber } from '../core/rng';
import { renderCategoryScreen, type ArchiveDay, type CategoryStatus } from './category-screen';
import { renderIntroScreen } from './intro-screen';
import { renderRoundScreen, type RoundScreenHandle } from './round-screen';
import { renderRevealScreen } from './reveal-screen';
import { renderEndScreen } from './end-screen';
import { createScene } from './scene';
import { createHud } from './hud';
import { createSound } from './sound';

export interface AppOptions {
  /** Hier komen de schermen. */
  root: HTMLElement;
  /** Hier komt de HUD (bovenbalk). */
  hudRoot: HTMLElement;
  /** Hier komt de achtergrondscène (doorsnede van de aarde). */
  sceneRoot: HTMLElement;
  categories: readonly Category[];
  dateKey: string;
  store: KeyValueStore;
  /** Categorie om direct mee te beginnen (uit de URL); anders het keuzescherm. */
  initialCategory?: Category | null;
  /** Onbeperkte puzzel om direct mee te beginnen (`?game=N`); vereist initialCategory. */
  initialGameNumber?: number | null;
  /** Archiefpuzzel om direct mee te beginnen (`?archief=YYYY-MM-DD`); vereist initialCategory. */
  initialArchiveDate?: string | null;
  /** Wordt aangeroepen als de gekozen puzzel wisselt, zodat de URL mee kan veranderen. */
  onPuzzleChange?: (category: Category | null, ref: PuzzleRef | null) => void;
  /** Geeft de deelbare link voor een onbeperkte of archiefpuzzel. */
  shareUrlFor?: (category: Category, ref: PuzzleRef) => string;
}

/** De onbeperkte reeks begint per categorie bij #1, zodat spelers dezelfde nummers delen. */
const FIRST_UNLIMITED_GAME = 1;
/** Hoe lang de graafanimatie duurt voordat de tier verschijnt (zie ook style.css). */
const DIG_MS = 900;

/**
 * Drijft keuzescherm → (ronde → onthulling → …) → eindscherm aan en bewaart de voortgang per
 * categorie en modus na elke stap. Bij herladen gaat het spel verder waar het was; een al
 * voltooide dagpuzzel toont direct het eindscherm, een voltooide onbeperkte puzzel ook (met
 * "Volgende puzzel"). De scène graaft mee: diepte = totaalscore.
 */
export function startApp(options: AppOptions): void {
  const { root, categories, dateKey, store } = options;
  let activeRound: RoundScreenHandle | null = null;
  let mode: GameMode = options.initialGameNumber
    ? 'unlimited'
    : options.initialArchiveDate
      ? 'archive'
      : 'daily';
  /** De categorie die het archief laat zien. */
  let archiveCategory: Category = options.initialCategory ?? categories[0]!;
  /** Het scherm waarnaar de help-knop terugkeert. */
  let resume: () => void = () => showCategories();

  const scene = createScene();
  options.sceneRoot.replaceChildren(scene.el);
  const sound = createSound(store);
  const hud = createHud({
    soundOn: sound.on,
    onHome: () => showCategories(),
    onHelp: () => showHelp(),
    onToggleSound: () => hud.setSound(sound.toggle()),
  });
  options.hudRoot.replaceChildren(hud.el);

  function mount(el: HTMLElement) {
    activeRound?.destroy();
    activeRound = null;
    root.replaceChildren(el);
    window.scrollTo({ top: 0 });
  }

  function showHud(game: GameState) {
    hud.setPlaying(true);
    hud.update({
      depthUnits: totalScore(game),
      score: totalScore(game),
      results: game.results.map((r) => r.score.total),
      totalRounds: game.puzzle.length,
      currentRound: game.results.length,
    });
  }

  /** De puzzel die een categorie in deze modus nu "aan de beurt" heeft. */
  function currentRef(category: Category, forMode: GameMode): PuzzleRef {
    // Het archief kiest zelf een datum; vanuit de categoriekaarten is het altijd vandaag.
    if (forMode !== 'unlimited') return { mode: 'daily', dateKey };
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

  function archiveDays(category: Category): ArchiveDay[] {
    const history = loadHistory(store, category.id);
    return archiveDates(dateKey).map((d) => {
      // Er is per categorie hooguit één archiefpuzzel "bezig"; loadProgress geeft null voor de rest.
      const progress = loadProgress(store, category.id, { mode: 'archive', dateKey: d });
      return {
        dateKey: d,
        number: puzzleNumber(d),
        score: history[d] ?? null,
        roundsPlayed: progress?.rounds.length ?? 0,
      };
    });
  }

  function showCategories() {
    resume = showCategories;
    options.onPuzzleChange?.(null, null);
    hud.setPlaying(false);
    scene.setDepth(0, false);
    scene.setView('surface', true);
    mount(
      renderCategoryScreen({
        categories,
        mode,
        statusOf,
        onSelect: (category, forMode) => play(category, currentRef(category, forMode)),
        onModeChange: (next) => {
          mode = next;
          showCategories();
          root.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus();
        },
        archive: {
          category: archiveCategory,
          days: archiveDays(archiveCategory),
          onCategory: (category) => {
            archiveCategory = category;
            showCategories();
            root.querySelector<HTMLButtonElement>(`[data-archive-cat="${category.id}"]`)?.focus();
          },
          onSelect: (d) => play(archiveCategory, { mode: 'archive', dateKey: d }),
        },
      }),
    );
  }

  function showHelp() {
    const back = resume;
    mount(
      renderIntroScreen({
        buttonLabel: 'TERUG NAAR HET SPEL',
        onContinue: () => back(),
      }),
    );
  }

  function play(category: Category, ref: PuzzleRef) {
    mode = ref.mode;
    options.onPuzzleChange?.(category, ref);
    const matcher = new Matcher(category.items);
    const loaded = loadGame(category, ref);
    const fresh = loaded.fresh;
    let { game, roundStartedAt } = loaded;

    scene.setDepth(totalScore(game), false);
    scene.setView('dig', true);
    showHud(game);

    function persist() {
      saveProgress(store, category.id, ref.mode, {
        version: 2,
        puzzleKey: puzzleKey(ref),
        rounds: toSavedRounds(game),
        roundStartedAt,
      });
    }

    /**
     * Dagpuzzel: statistieken + streak + geschiedenis. Archief: alleen de geschiedenis.
     * Onbeperkt: de aparte onbeperkt-statistieken.
     */
    function recordStats() {
      const score = totalScore(game);
      if (ref.mode === 'unlimited') {
        saveStats(
          store,
          category.id,
          recordUnlimitedCompletion(loadStats(store, category.id), score),
        );
        return;
      }
      recordHistory(store, category.id, ref.dateKey, score);
      if (ref.mode === 'daily') {
        saveStats(
          store,
          category.id,
          recordCompletion(loadStats(store, category.id), ref.dateKey, score),
        );
      }
    }

    function showRound() {
      const stat = currentStat(game);
      if (!stat) {
        showEnd();
        return;
      }
      resume = showRound;
      showHud(game);
      scene.setView('dig', true);
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
          const before = totalScore(game);
          game = submitRound(game, answerId, seconds);
          roundStartedAt = null;
          if (isComplete(game)) recordStats();
          persist();
          sound.dig();
          scene.setDepth(totalScore(game), true);
          scene.burst();
          window.setTimeout(
            () => sound.reveal(game.results[game.results.length - 1]!.score.total),
            DIG_MS,
          );
          showReveal(before, true);
        },
      });
      mount(handle.el);
      activeRound = handle;
    }

    function showReveal(depthBefore?: number, animate = false) {
      resume = () => showReveal();
      const result = game.results[game.results.length - 1]!;
      const after = totalScore(game);
      showHud(game);
      mount(
        renderRevealScreen({
          result,
          items: category.items,
          noun: category.noun,
          depthBefore: depthBefore ?? after - result.score.total,
          depthAfter: after,
          animate,
          isLastRound: isComplete(game),
          onNext: () => (isComplete(game) ? showEnd() : showRound()),
        }),
      );
    }

    function showEnd() {
      resume = showEnd;
      showHud(game);
      mount(
        renderEndScreen({
          game,
          stats: loadStats(store, category.id),
          onOtherCategory: () => {
            if (ref.mode === 'archive') archiveCategory = category;
            showCategories();
          },
          onNextPuzzle:
            ref.mode === 'unlimited'
              ? () => play(category, { mode: 'unlimited', number: ref.number + 1 })
              : undefined,
          shareUrl: ref.mode !== 'daily' ? options.shareUrlFor?.(category, ref) : undefined,
        }),
      );
    }

    if (isComplete(game)) showEnd();
    else if (!fresh && game.results.length > 0 && roundStartedAt === null) showReveal();
    else showRound();
  }

  const start = () => {
    const { initialCategory, initialGameNumber, initialArchiveDate } = options;
    if (initialCategory && initialGameNumber)
      play(initialCategory, { mode: 'unlimited', number: initialGameNumber });
    else if (initialCategory && initialArchiveDate)
      play(initialCategory, { mode: 'archive', dateKey: initialArchiveDate });
    else if (initialCategory) play(initialCategory, { mode: 'daily', dateKey });
    else showCategories();
  };

  // Eerste bezoek: eerst de uitleg. De timer van ronde 1 start pas daarna.
  if (!hasSeenIntro(store)) {
    hud.setPlaying(false);
    scene.setView('surface', false);
    mount(
      renderIntroScreen({
        buttonLabel: 'BEGIN TE GRAVEN ▼',
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
