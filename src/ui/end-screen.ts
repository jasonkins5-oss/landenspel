import { emojiGrid, MAX_TOTAL_SCORE, totalScore, type GameState } from '../core/game';
import { EARTH_RADIUS_KM, formatDepth, layerAt, tierFor, unitsToKm } from '../core/depth';
import { puzzleNumber } from '../core/rng';
import { effectiveStreak, type PlayerStats } from '../core/storage';
import { escapeHtml } from './html';

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

/** "Dieren #12" (dagpuzzel), "Dieren #3, archief" of "Dieren, onbeperkt #42". */
export function puzzleLabel(game: GameState): string {
  const { ref, category } = game;
  if (ref.mode === 'unlimited') return `${category.title}, onbeperkt #${ref.number}`;
  const label = `${category.title} #${puzzleNumber(ref.dateKey)}`;
  return ref.mode === 'archive' ? `${label}, archief` : label;
}

export function shareText(game: GameState, shareUrl?: string): string {
  const total = totalScore(game);
  const depth = formatDepth(unitsToKm(total));
  const lines = [
    `Landenspel · ${puzzleLabel(game)}: ${total}/${MAX_TOTAL_SCORE}`,
    `⛏️ ${depth} diep`,
    emojiGrid(game),
  ];
  if (shareUrl) lines.push(shareUrl);
  return lines.join('\n');
}

export function renderEndScreen(options: EndScreenOptions): HTMLElement {
  const { game, stats, onOtherCategory, onNextPuzzle, shareUrl } = options;
  const total = totalScore(game);
  const depthKm = unitsToKm(total);
  const layer = layerAt(total);
  const { ref } = game;
  const unlimited = ref.mode === 'unlimited';
  const played = unlimited ? stats.unlimitedPlayed : stats.played;
  const sum = unlimited ? stats.unlimitedTotalScore : stats.totalScore;
  const average = played > 0 ? Math.round(sum / played) : 0;
  // Archiefpuzzels hebben geen eigen statistieken: ze tellen nergens mee.
  const statCells: [string, number][] =
    ref.mode === 'unlimited'
      ? [
          ['GESPEELD', played],
          ['GEMIDDELD', average],
          ['BESTE', stats.unlimitedBest],
        ]
      : ref.mode === 'daily'
        ? [
            ['GESPEELD', played],
            ['GEMIDDELD', average],
            ['BESTE', stats.best],
            ['STREAK', effectiveStreak(stats, ref.dateKey)],
            ['LANGSTE', stats.longestStreak],
          ]
        : [];
  const footer =
    ref.mode === 'daily'
      ? `<p class="next-puzzle">Morgen een nieuwe puzzel (om ${nextPuzzleLocalTime()} jouw tijd).</p>`
      : ref.mode === 'archive'
        ? '<p class="next-puzzle">Archiefpuzzels tellen niet mee voor je streak of statistieken.</p>'
        : '';

  const el = document.createElement('div');
  el.className = 'end-screen';
  el.innerHTML = `
    <section class="panel end-panel">
      <h2 class="end-title">${escapeHtml(puzzleLabel(game))} afgerond</h2>
      <p class="end-total"><strong>${total}</strong> / ${MAX_TOTAL_SCORE}</p>
      <p class="end-depth">Je groef <strong>${escapeHtml(formatDepth(depthKm))}</strong> diep, tot in de
        <strong>${escapeHtml(layer.name.toLowerCase())}</strong>.
        ${total >= MAX_TOTAL_SCORE ? 'Je hebt het middelpunt bereikt!' : `Het middelpunt ligt op ${escapeHtml(formatDepth(EARTH_RADIUS_KM))}.`}</p>
      <p class="end-grid" aria-hidden="true">${emojiGrid(game)}</p>
      <ol class="round-summary">
        ${game.results
          .map((r, i) => {
            const tier = tierFor(r.score.total);
            return `
          <li>
            <span class="round-summary__num">${i + 1}</span>
            <span class="round-summary__question">${escapeHtml(r.stat.question)}</span>
            <span class="round-summary__tier" style="--tier-color: ${tier.color}">${escapeHtml(tier.name)}</span>
            <span class="round-summary__score">${r.score.total}</span>
          </li>`;
          })
          .join('')}
      </ol>
      <div class="end-actions">
        ${onNextPuzzle ? '<button type="button" class="btn btn--primary next-puzzle-btn">VOLGENDE PUZZEL ▼</button>' : ''}
        <button type="button" class="btn ${onNextPuzzle ? 'btn--ghost' : 'btn--primary'} share-btn">DEEL JE SCORE</button>
        <button type="button" class="btn btn--ghost other-category-btn">${ref.mode === 'archive' ? 'TERUG NAAR ARCHIEF' : 'ANDERE CATEGORIE'}</button>
      </div>
      <p class="share-feedback" aria-live="polite"></p>
      ${
        statCells.length > 0
          ? `<dl class="player-stats" aria-label="Jouw statistieken voor ${escapeHtml(game.category.title)}${unlimited ? ' (onbeperkt)' : ''}">
        ${statCells.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
      </dl>`
          : ''
      }
      ${footer}
    </section>
  `;

  const shareBtn = el.querySelector<HTMLButtonElement>('.share-btn')!;
  const feedback = el.querySelector<HTMLParagraphElement>('.share-feedback')!;
  shareBtn.addEventListener('click', () => void share(game, feedback, shareUrl));
  el.querySelector<HTMLButtonElement>('.other-category-btn')!.addEventListener(
    'click',
    onOtherCategory,
  );
  const first = el.querySelector<HTMLButtonElement>(
    onNextPuzzle ? '.next-puzzle-btn' : '.share-btn',
  )!;
  if (onNextPuzzle) first.addEventListener('click', onNextPuzzle);
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
