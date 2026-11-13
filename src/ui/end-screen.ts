import { emojiGrid, MAX_TOTAL_SCORE, totalScore, type GameState } from '../core/game';
import { puzzleNumber } from '../core/rng';
import { effectiveStreak, type PlayerStats } from '../core/storage';

export interface EndScreenOptions {
  game: GameState;
  stats: PlayerStats;
}

function shareText(game: GameState): string {
  const total = totalScore(game);
  return [
    `Landenspel #${puzzleNumber(game.dateKey)}: ${total}/${MAX_TOTAL_SCORE}`,
    emojiGrid(game),
  ].join('\n');
}

export function renderEndScreen(options: EndScreenOptions): HTMLElement {
  const { game, stats } = options;
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
    <h2>Puzzel #${puzzleNumber(game.dateKey)} afgerond</h2>
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
    <button type="button" class="share-btn">Deel je score</button>
    <p class="share-feedback muted" aria-live="polite"></p>
    <dl class="player-stats">
      ${statCells
        .map(([label, value]) => `<div><dt class="muted">${label}</dt><dd>${value}</dd></div>`)
        .join('')}
    </dl>
    <p class="muted next-puzzle">Morgen een nieuwe puzzel (om ${nextPuzzleLocalTime()} jouw tijd).</p>
  `;

  const shareBtn = el.querySelector<HTMLButtonElement>('.share-btn')!;
  const feedback = el.querySelector<HTMLParagraphElement>('.share-feedback')!;
  shareBtn.addEventListener('click', () => void share(game, feedback));

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
