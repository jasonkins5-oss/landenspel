import type { PromptAnswers, PromptMeta } from '../core/answers';
import { AnswerMatcher } from '../core/match';
import { mostCommon, deepCuts, rarityOf, type AnswerCounts } from '../core/rarity';
import type { CountsBackend } from '../core/counts';
import {
  addResult,
  createGame,
  currentPrompt,
  isComplete,
  puzzleKey,
  restoreGame,
  timedOutResult,
  totalScore,
  type GameMode,
  type GameState,
  type PuzzleRef,
  type RoundResult,
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
import { archiveDates, hashString, mulberry32, puzzleNumber } from '../core/rng';
import { renderStartScreen, type ArchiveDay, type ModeStatus } from './start-screen';
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
  prompts: readonly PromptMeta[];
  loadAnswers: (id: string) => Promise<PromptAnswers>;
  counts: CountsBackend;
  dateKey: string;
  store: KeyValueStore;
  /** Puzzel om direct mee te beginnen (uit de URL); anders het startscherm. */
  initialRef?: PuzzleRef | null;
  /** Wordt aangeroepen als de gekozen puzzel wisselt, zodat de URL mee kan veranderen. */
  onPuzzleChange?: (ref: PuzzleRef | null) => void;
  /** Geeft de deelbare link voor een puzzel. */
  shareUrlFor?: (ref: PuzzleRef) => string;
}

/** Hoe lang de graafanimatie duurt voordat de tier verschijnt (zie ook style.css). */
const DIG_MS = 900;

/**
 * Drijft startscherm → (ronde → onthulling → …) → eindscherm aan en bewaart de voortgang per
 * modus na elke stap. Bij herladen gaat het spel verder waar het was. De scène graaft mee:
 * diepte = totaalscore.
 */
export function startApp(options: AppOptions): void {
  const { root, prompts, dateKey, store, counts } = options;
  let activeRound: RoundScreenHandle | null = null;
  let mode: GameMode = options.initialRef?.mode ?? 'daily';
  /** Het scherm waarnaar de help-knop terugkeert. */
  let resume: () => void = () => showStart();
  const matchers = new Map<string, AnswerMatcher>();

  const scene = createScene();
  options.sceneRoot.replaceChildren(scene.el);
  const sound = createSound(store);
  const hud = createHud({
    soundOn: sound.on,
    onHome: () => showStart(),
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

  function matcherFor(answers: PromptAnswers): AnswerMatcher {
    let m = matchers.get(answers.id);
    if (!m) {
      m = new AnswerMatcher(answers.answers);
      matchers.set(answers.id, m);
    }
    return m;
  }

  function showHud(game: GameState) {
    hud.setPlaying(true);
    hud.update({
      depthUnits: totalScore(game),
      score: totalScore(game),
      results: game.results.map((r) => r.points),
      totalRounds: game.puzzle.length,
      currentRound: game.results.length,
    });
  }

  /** De puzzel die in deze modus nu "aan de beurt" is (niet voor het archief). */
  function currentRef(forMode: Exclude<GameMode, 'archive'>): PuzzleRef {
    if (forMode === 'daily') return { mode: 'daily', dateKey };
    const saved = loadProgress(store, { mode: 'unlimited', number: 0 });
    if (!saved) return { mode: 'unlimited', number: 1 };
    const number = Number(saved.puzzleKey);
    const done = restoreGame({ mode: 'unlimited', number }, prompts, saved.results);
    return { mode: 'unlimited', number: isComplete(done) ? number + 1 : number };
  }

  function loadGame(ref: PuzzleRef): {
    game: GameState;
    roundStartedAt: number | null;
    fresh: boolean;
  } {
    const saved = loadProgress(store, ref);
    const game = saved ? restoreGame(ref, prompts, saved.results) : createGame(ref, prompts);
    // Een opgeslagen starttijd geldt alleen voor de ronde die nog open stond.
    const roundStartedAt =
      saved && saved.results.length === game.results.length ? saved.roundStartedAt : null;
    return { game, roundStartedAt, fresh: !saved };
  }

  function modeStatus(forMode: Exclude<GameMode, 'archive'>): ModeStatus {
    const ref = currentRef(forMode);
    const { game } = loadGame(ref);
    const title =
      ref.mode === 'daily'
        ? `Today’s dive #${puzzleNumber(ref.dateKey)}`
        : `Dive #${puzzleKey(ref)}`;
    if (isComplete(game))
      return { title, status: `Done: ${totalScore(game)} points`, action: 'SEE RESULT' };
    if (game.results.length > 0)
      return {
        title,
        status: `Prompt ${game.results.length + 1} of ${game.puzzle.length}`,
        action: 'CONTINUE',
      };
    return {
      title,
      status: `${game.puzzle.length} prompts · 30 seconds each`,
      action: 'BEGIN DESCENT',
    };
  }

  function archiveDays(): ArchiveDay[] {
    const history = loadHistory(store);
    return archiveDates(dateKey).map((d) => ({
      dateKey: d,
      number: puzzleNumber(d),
      score: history[d] ?? null,
      roundsPlayed: loadProgress(store, { mode: 'archive', dateKey: d })?.results.length ?? 0,
    }));
  }

  function showStart() {
    resume = showStart;
    options.onPuzzleChange?.(null);
    hud.setPlaying(false);
    scene.setDepth(0, false);
    scene.setView('surface', true);
    mount(
      renderStartScreen({
        mode,
        status: modeStatus(mode === 'archive' ? 'daily' : mode),
        archiveDays: mode === 'archive' ? archiveDays() : [],
        promptCount: prompts.length,
        onModeChange: (next) => {
          mode = next;
          showStart();
          root.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus();
        },
        onStart: () => play(currentRef(mode === 'archive' ? 'daily' : mode)),
        onArchiveSelect: (d) => play({ mode: 'archive', dateKey: d }),
      }),
    );
  }

  function showHelp() {
    const back = resume;
    mount(renderIntroScreen({ buttonLabel: 'BACK TO THE DIVE', onContinue: () => back() }));
  }

  function play(ref: PuzzleRef) {
    mode = ref.mode;
    options.onPuzzleChange?.(ref);
    const loaded = loadGame(ref);
    const fresh = loaded.fresh;
    let { game, roundStartedAt } = loaded;

    // Alle vragen van deze puzzel alvast laden; ze zijn klein en zo hapert er niets.
    for (const p of game.puzzle) void options.loadAnswers(p.id).catch(() => {});

    scene.setDepth(totalScore(game), false);
    scene.setView('dig', true);
    showHud(game);

    function persist() {
      saveProgress(store, ref.mode, {
        version: 3,
        puzzleKey: puzzleKey(ref),
        results: game.results,
        roundStartedAt,
      });
    }

    /** Daily: stats + streak + geschiedenis. Archive: alleen geschiedenis. Unlimited: eigen stats. */
    function recordStats() {
      const score = totalScore(game);
      if (ref.mode === 'unlimited') {
        saveStats(store, recordUnlimitedCompletion(loadStats(store), score));
        return;
      }
      recordHistory(store, ref.dateKey, score);
      if (ref.mode === 'daily')
        saveStats(store, recordCompletion(loadStats(store), ref.dateKey, score));
    }

    function finishRound(
      result: RoundResult,
      typed: string | undefined,
      countsAfter: AnswerCounts,
    ) {
      const before = totalScore(game);
      game = addResult(game, result);
      roundStartedAt = null;
      if (isComplete(game)) recordStats();
      persist();
      sound.dig();
      scene.setDepth(totalScore(game), true);
      scene.burst();
      window.setTimeout(() => sound.reveal(result.points), DIG_MS);
      void showReveal({ typed, depthBefore: before, animate: true, counts: countsAfter });
    }

    function showRound() {
      const prompt = currentPrompt(game);
      if (!prompt) {
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
      const answersPromise = options.loadAnswers(prompt.id);
      // Tellingen alvast ophalen, zodat indienen niet op de server hoeft te wachten.
      const countsPromise = counts.get(prompt.id);

      const handle = renderRoundScreen({
        roundNumber: game.results.length + 1,
        totalRounds: game.puzzle.length,
        prompt: prompt.prompt,
        startedAt: roundStartedAt,
        ready: answersPromise.then(() => undefined),
        onAnswer: async (text) => {
          const answers = await answersPromise;
          const match = matcherFor(answers).match(text);
          if (!match) return 'unknown';
          const answer = answers.answers[match.index]!;
          const before = await countsPromise;
          const rarity = rarityOf(answers.answers, match.index, before);
          void counts.record(prompt.id, answer.id);
          finishRound(
            {
              promptId: prompt.id,
              answerId: answer.id,
              answer: answer.name,
              points: rarity.points,
              rarerThan: rarity.rarerThan,
            },
            text,
            { ...before, [answer.id]: (before[answer.id] ?? 0) + 1 },
          );
          return 'accepted';
        },
        onTimeout: () => {
          void countsPromise.then((c) => finishRound(timedOutResult(prompt.id), undefined, c));
        },
      });
      mount(handle.el);
      activeRound = handle;
    }

    async function showReveal(
      info: {
        typed?: string;
        depthBefore?: number;
        animate?: boolean;
        counts?: AnswerCounts;
      } = {},
    ) {
      resume = () => void showReveal();
      const index = game.results.length - 1;
      const result = game.results[index]!;
      const prompt = game.puzzle[index]!;
      const after = totalScore(game);
      showHud(game);
      const next = game.puzzle[index + 1];
      if (next) void options.loadAnswers(next.id).catch(() => {});

      let answers: PromptAnswers | null = null;
      try {
        answers = await options.loadAnswers(prompt.id);
      } catch {
        answers = null;
      }
      const c = info.counts ?? (await counts.get(prompt.id));
      const rand = mulberry32(hashString(`${prompt.id}:${puzzleKey(ref)}`));
      mount(
        renderRevealScreen({
          prompt: prompt.prompt,
          result,
          typed: info.typed,
          common: answers ? mostCommon(answers.answers, c, 5) : [],
          deepCuts: answers ? deepCuts(answers.answers, rand, 3, result.answerId ?? undefined) : [],
          depthBefore: info.depthBefore ?? after - result.points,
          depthAfter: after,
          liveCounts: counts.live,
          answersSoFar: Object.values(c).reduce((s, n) => s + n, 0),
          animate: info.animate ?? false,
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
          stats: loadStats(store),
          onHome: () => showStart(),
          onNextDive:
            ref.mode === 'unlimited'
              ? () => play({ mode: 'unlimited', number: ref.number + 1 })
              : undefined,
          shareUrl: options.shareUrlFor?.(ref),
        }),
      );
    }

    if (isComplete(game)) showEnd();
    else if (!fresh && game.results.length > 0 && roundStartedAt === null) void showReveal();
    else showRound();
  }

  const start = () => (options.initialRef ? play(options.initialRef) : showStart());

  // Eerste bezoek: eerst de uitleg. De timer van ronde 1 start pas daarna.
  if (!hasSeenIntro(store)) {
    hud.setPlaying(false);
    scene.setView('surface', false);
    mount(
      renderIntroScreen({
        buttonLabel: 'BEGIN DESCENT ▼',
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
