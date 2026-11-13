import type { Item } from '../data/types';
import type { RoundResult } from '../core/game';
import { formatValue } from '../core/format';
import { rankItems, rankOf, topN } from '../core/ranking';

export interface RevealScreenOptions {
  result: RoundResult;
  items: readonly Item[];
  /** Enkelvoud van wat de speler koos, bv. "land" of "dier"; voor de tekst "Geen data bekend voor dit dier". */
  noun: string;
  onNext: () => void;
  isLastRound: boolean;
}

/** Onthullingsscherm: gekozen antwoord, rang, scorebalk, top 5 en de tijdstraf. */
export function renderRevealScreen(options: RevealScreenOptions): HTMLElement {
  const { result, items, noun, onNext, isLastRound } = options;
  const { stat, answerId, score } = result;
  const ranking = rankItems(stat, items);
  const top5 = topN(ranking, 5);
  const chosen = answerId ? rankOf(ranking, answerId) : undefined;
  const chosenItem = answerId ? items.find((c) => c.id === answerId) : undefined;

  const el = document.createElement('div');
  el.className = 'reveal-screen';

  const statusLine = score.timedOut
    ? 'Tijd verlopen — geen punten.'
    : score.noData
      ? `Geen data bekend voor ${chosenItem?.nameNl ?? `dit ${noun}`} — geen punten.`
      : chosen
        ? `${chosenItem!.nameNl}: ${formatValue(stat, chosen.value)} (plek ${chosen.rank} van ${ranking.length})`
        : `Geen ${noun} gekozen.`;

  el.innerHTML = `
    <h2 class="question">${escapeHtml(stat.question)}</h2>
    <p class="reveal-status">${escapeHtml(statusLine)}</p>
    <div class="score-breakdown">
      <div class="score-bar" role="img" aria-label="${score.total} van 1000 punten">
        <div class="score-bar__fill" style="width: ${(score.total / 1000) * 100}%"></div>
      </div>
      <p class="score-line">
        <strong>${score.total}</strong> punten
        ${score.penalty > 0 ? `<span class="muted">(${score.base} − ${score.penalty} tijdstraf)</span>` : ''}
      </p>
    </div>
    <ol class="top5">
      ${top5
        .map(
          (r) => `
        <li class="top5__item${answerId === r.item.id ? ' top5__item--chosen' : ''}">
          <span class="top5__rank">${r.rank}.</span>
          <span class="top5__name">${escapeHtml(r.item.nameNl)}</span>
          <span class="top5__value muted">${escapeHtml(formatValue(stat, r.value))}</span>
        </li>`,
        )
        .join('')}
    </ol>
    <p class="source muted">Bron: ${escapeHtml(stat.source)}, ${stat.year}</p>
    <button type="button" class="next-btn">${isLastRound ? 'Bekijk resultaat' : 'Volgende ronde'}</button>
  `;

  el.querySelector<HTMLButtonElement>('.next-btn')!.addEventListener('click', onNext);
  queueMicrotask(() => el.querySelector<HTMLButtonElement>('.next-btn')!.focus());

  return el;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
