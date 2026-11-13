import { emojiGrid, MAX_TOTAL_SCORE, totalScore, type GameState } from '../core/game';
import { puzzleNumber } from '../core/rng';
import { effectiveStreak, type PlayerStats } from '../core/storage';

export interface EndScreenOptions {
  game: GameState;
  stats: PlayerStats;
  /** Terug naar het keuzescherm. */
  onOtherCategory: () => void;
}

export function shareText(game: GameState): string {
  const total = totalScore(game);
  return [
    `Landenspel · ${game.category.title} #${puzzleNumber(game.dateKey)}: ${total}/${MAX_TOTAL_SCORE}`,
    emojiGrid(game),
  ].join('\n');
}

export function renderEndScreen(options: EndScreenOptions): HTMLElement {
  const { game, stats, onOtherCategory } = options;
  const total = totalScore(game);
  const average = stats.played > 0 ? Math.round(stats.totalScore / stats.played) : 0;
  const statCells: [string, number][] = [
    ['Gespeeld', stats.played],
    ['Gemiddeld', average],
    ['Beste', stats.best],
    ['Streak', effectiveStreak(stats, game.dateKey)],
    ['Langste streak', stats.longestStreak],
  ];

  const el = document.createElement('div');
  el.className = 'end-screen';
  el.innerHTML = `
    <h2>${escapeHtml(game.category.title)} #${puzzleNumber(game.dateKey)} afgerond</h2>
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
      <button type="button" class="share-btn">Deel je score</button>
      <button type="button" class="other-category-btn">Andere categorie</button>
    </div>
    <p class="share-feedback muted" aria-live="polite"></p>
    <dl class="player-stats" aria-label="Jouw statistieken voor ${escapeHtml(game.category.title)}">
      ${statCells
        .map(([label, value]) => `<div><dt class="muted">${label}</dt><dd>${value}</dd></div>`)
        .join('')}
    </dl>
    <p class="muted next-puzzle">Morgen een nieuwe puzzel (om ${nextPuzzleLocalTime()} jouw tijd).</p>
  `;

  const shareBtn = el.querySelector<HTMLButtonElement>('.share-btn')!;
  const feedback = el.querySelector<HTMLParagraphElement>('.share-feedback')!;
  shareBtn.addEventListener('click', () => void share(game, feedback));
  el.querySelector<HTMLButtonElement>('.other-category-btn')!.addEventListener('click', onOtherCategory);

  return el;
}

async function share(game: GameState, feedback: HTMLElement): Promise<void> {
  const text = shareText(game);
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
