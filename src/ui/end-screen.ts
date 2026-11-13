import { emojiGrid, MAX_TOTAL_SCORE, totalScore, type GameState } from '../core/game';
import { puzzleNumber } from '../core/rng';
import { effectiveStreak, type PlayerStats } from '../core/storage';

export interface EndScreenOptions {
  game: GameState;
  stats: PlayerStats;
  /** Terug naar het keuzescherm. */
  onOtherCategory: () => void;
  /** Alleen onbeperkt: de volgende puzzel in dezelfde categorie. */
  onNextPuzzle?: () => void;
  /** Deelbare link naar deze puzzel (onbeperkt); wordt aan de deeltekst toegevoegd. */
  shareUrl?: string;
}

/** "Dieren #12" (dagpuzzel) of "Dieren, onbeperkt #42". */
export function puzzleLabel(game: GameState): string {
  return game.ref.mode === 'daily'
    ? `${game.category.title} #${puzzleNumber(game.ref.dateKey)}`
    : `${game.category.title}, onbeperkt #${game.ref.number}`;
}

export function shareText(game: GameState, shareUrl?: string): string {
  const total = totalScore(game);
  const lines = [`Landenspel · ${puzzleLabel(game)}: ${total}/${MAX_TOTAL_SCORE}`, emojiGrid(game)];
  if (shareUrl) lines.push(shareUrl);
  return lines.join('\n');
}

export function renderEndScreen(options: EndScreenOptions): HTMLElement {
  const { game, stats, onOtherCategory, onNextPuzzle, shareUrl } = options;
  const total = totalScore(game);
  const unlimited = game.ref.mode === 'unlimited';
  const played = unlimited ? stats.unlimitedPlayed : stats.played;
  const sum = unlimited ? stats.unlimitedTotalScore : stats.totalScore;
  const average = played > 0 ? Math.round(sum / played) : 0;
  const statCells: [string, number][] =
    game.ref.mode === 'unlimited'
      ? [
          ['Gespeeld', played],
          ['Gemiddeld', average],
          ['Beste', stats.unlimitedBest],
        ]
      : [
          ['Gespeeld', played],
          ['Gemiddeld', average],
          ['Beste', stats.best],
          ['Streak', effectiveStreak(stats, game.ref.dateKey)],
          ['Langste streak', stats.longestStreak],
        ];

  const el = document.createElement('div');
  el.className = 'end-screen';
  el.innerHTML = `
    <h2>${escapeHtml(puzzleLabel(game))} afgerond</h2>
    <p class="end-total"><strong>${total}</strong> / ${MAX_TOTAL_SCORE} punten</p>
    <p class="end-grid" aria-hidden="true">${emojiGrid(game)}</p>
    <ol class="round-summary">
      ${game.results
        .map(
          (r, i) => `
        <li>
          <span class="round-summary__num muted">${i + 1}.</span>
          <span class="round-summary__question">${escapeHtml(r.stat.question)}</span>
          <span class="round-summary__score">${r.score.total}</span>
        </li>`,
        )
        .join('')}
    </ol>
    <div class="end-actions">
      ${onNextPuzzle ? '<button type="button" class="next-puzzle-btn">Volgende puzzel</button>' : ''}
      <button type="button" class="share-btn">Deel je score</button>
      <button type="button" class="other-category-btn">Andere categorie</button>
    </div>
    <p class="share-feedback muted" aria-live="polite"></p>
    <dl class="player-stats" aria-label="Jouw statistieken voor ${escapeHtml(game.category.title)}${unlimited ? ' (onbeperkt)' : ''}">
      ${statCells
        .map(([label, value]) => `<div><dt class="muted">${label}</dt><dd>${value}</dd></div>`)
        .join('')}
    </dl>
    ${unlimited ? '' : `<p class="muted next-puzzle">Morgen een nieuwe puzzel (om ${nextPuzzleLocalTime()} jouw tijd).</p>`}
  `;

  const shareBtn = el.querySelector<HTMLButtonElement>('.share-btn')!;
  const feedback = el.querySelector<HTMLParagraphElement>('.share-feedback')!;
  shareBtn.addEventListener('click', () => void share(game, feedback, shareUrl));
  el.querySelector<HTMLButtonElement>('.other-category-btn')!.addEventListener(
    'click',
    onOtherCategory,
  );
  if (onNextPuzzle) {
    const next = el.querySelector<HTMLButtonElement>('.next-puzzle-btn')!;
    next.addEventListener('click', onNextPuzzle);
    queueMicrotask(() => next.focus());
  }

  return el;
}

async function share(game: GameState, feedback: HTMLElement, shareUrl?: string): Promise<void> {
  const text = shareText(game, shareUrl);
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    feedback.textContent = 'Gekopieerd naar het klembord!';
  } catch {
    // De speler annuleerde het deelvenster, of klembord/delen is niet beschikbaar.
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = 'Gekopieerd naar het klembord!';
    } catch {
      feedback.textContent = text;
    }
  }
}

/** De puzzel wisselt om 00:00 UTC; dit is dat moment in de tijdzone van de speler. */
function nextPuzzleLocalTime(): string {
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return next.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
