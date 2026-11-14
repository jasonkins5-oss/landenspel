import { emojiGrid, MAX_TOTAL_SCORE, totalScore, type GameState } from '../core/game';
import { EARTH_RADIUS_KM, formatDepth, layerAt, tierFor, unitsToKm } from '../core/depth';
import { puzzleNumber } from '../core/rng';
import { effectiveStreak, type PlayerStats } from '../core/storage';
import { escapeHtml } from './html';

export interface EndScreenOptions {
  game: GameState;
  stats: PlayerStats;
  /** Terug naar het startscherm. */
  onHome: () => void;
  /** Alleen unlimited: de volgende dive. */
  onNextDive?: () => void;
  /** Deelbare link naar deze puzzel. */
  shareUrl?: string;
}

/** "Daily #12", "Daily #3 (archive)" of "Dive #42". */
export function puzzleLabel(game: GameState): string {
  const { ref } = game;
  if (ref.mode === 'unlimited') return `Dive #${ref.number}`;
  const label = `Daily #${puzzleNumber(ref.dateKey)}`;
  return ref.mode === 'archive' ? `${label} (archive)` : label;
}

export function shareText(game: GameState, shareUrl?: string): string {
  const total = totalScore(game);
  const lines = [
    `CORE DIVE · ${puzzleLabel(game)}: ${total}/${MAX_TOTAL_SCORE}`,
    `⛏️ ${formatDepth(unitsToKm(total))} deep`,
    emojiGrid(game),
  ];
  if (shareUrl) lines.push(shareUrl);
  return lines.join('\n');
}

export function renderEndScreen(options: EndScreenOptions): HTMLElement {
  const { game, stats, onHome, onNextDive, shareUrl } = options;
  const { ref } = game;
  const total = totalScore(game);
  const layer = layerAt(total);
  const unlimited = ref.mode === 'unlimited';
  const played = unlimited ? stats.unlimitedPlayed : stats.played;
  const sum = unlimited ? stats.unlimitedTotalScore : stats.totalScore;
  const average = played > 0 ? Math.round(sum / played) : 0;
  // Archiefpuzzels hebben geen eigen statistieken: ze tellen nergens mee.
  const statCells: [string, number][] =
    ref.mode === 'unlimited'
      ? [
          ['DIVES', played],
          ['AVERAGE', average],
          ['BEST', stats.unlimitedBest],
        ]
      : ref.mode === 'daily'
        ? [
            ['PLAYED', played],
            ['AVERAGE', average],
            ['BEST', stats.best],
            ['STREAK', effectiveStreak(stats, ref.dateKey)],
            ['LONGEST', stats.longestStreak],
          ]
        : [];
  const footer =
    ref.mode === 'daily'
      ? `<p class="next-puzzle">A new daily dive at ${nextPuzzleLocalTime()} your time.</p>`
      : ref.mode === 'archive'
        ? '<p class="next-puzzle">Archive dives don’t count towards your streak or stats.</p>'
        : '';

  const el = document.createElement('div');
  el.className = 'end-screen';
  el.innerHTML = `
    <section class="panel end-panel">
      <h2 class="end-title">${escapeHtml(puzzleLabel(game))} complete</h2>
      <p class="end-total"><strong>${total}</strong> / ${MAX_TOTAL_SCORE}</p>
      <p class="end-depth">You dug <strong>${escapeHtml(formatDepth(unitsToKm(total)))}</strong> deep, into the
        <strong>${escapeHtml(layer.name.toLowerCase())}</strong>.
        ${total >= MAX_TOTAL_SCORE ? 'You reached the centre of the Earth!' : `The centre is ${escapeHtml(formatDepth(EARTH_RADIUS_KM))} down.`}</p>
      <p class="end-grid" aria-hidden="true">${emojiGrid(game)}</p>
      <ol class="round-summary">
        ${game.results
          .map((r, i) => {
            const tier = tierFor(r.points);
            const prompt = game.puzzle[i]?.prompt ?? '';
            return `
          <li>
            <span class="round-summary__num">${i + 1}</span>
            <span class="round-summary__question">${escapeHtml(prompt)}<span class="round-summary__answer">${r.answer ? escapeHtml(r.answer) : '(time ran out)'}</span></span>
            <span class="round-summary__tier" style="--tier-color: ${tier.color}">${escapeHtml(tier.name)}</span>
            <span class="round-summary__score">${r.points}</span>
          </li>`;
          })
          .join('')}
      </ol>
      <div class="end-actions">
        ${onNextDive ? '<button type="button" class="btn btn--primary next-dive-btn">NEXT DIVE ▼</button>' : ''}
        <button type="button" class="btn ${onNextDive ? 'btn--ghost' : 'btn--primary'} share-btn">SHARE</button>
        <button type="button" class="btn btn--ghost home-btn">${ref.mode === 'archive' ? 'BACK TO ARCHIVE' : 'MENU'}</button>
      </div>
      <p class="share-feedback" aria-live="polite"></p>
      ${
        statCells.length > 0
          ? `<dl class="player-stats" aria-label="Your stats${unlimited ? ' (unlimited)' : ''}">
        ${statCells.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
      </dl>`
          : ''
      }
      ${footer}
    </section>
  `;

  const feedback = el.querySelector<HTMLParagraphElement>('.share-feedback')!;
  el.querySelector<HTMLButtonElement>('.share-btn')!.addEventListener(
    'click',
    () => void share(game, feedback, shareUrl),
  );
  el.querySelector<HTMLButtonElement>('.home-btn')!.addEventListener('click', onHome);
  const first = el.querySelector<HTMLButtonElement>(onNextDive ? '.next-dive-btn' : '.share-btn')!;
  if (onNextDive) first.addEventListener('click', onNextDive);
  queueMicrotask(() => first.focus({ preventScroll: true }));
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
    feedback.textContent = 'Copied to clipboard!';
  } catch {
    // De speler annuleerde het deelvenster, of klembord/delen is niet beschikbaar.
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = 'Copied to clipboard!';
    } catch {
      feedback.textContent = text;
    }
  }
}

/** De dagpuzzel wisselt om 00:00 UTC; dit is dat moment in de tijdzone van de speler. */
function nextPuzzleLocalTime(): string {
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return next.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
