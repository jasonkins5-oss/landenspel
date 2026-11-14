import type { Item } from '../data/types';
import type { RoundResult } from '../core/game';
import { formatDepth, layerAt, tierFor, unitsToKm } from '../core/depth';
import { formatValue } from '../core/format';
import { rankItems, rankOf, topN } from '../core/ranking';
import { escapeHtml } from './html';

export interface RevealScreenOptions {
  result: RoundResult;
  items: readonly Item[];
  /** Enkelvoud van wat de speler koos, bv. "land" of "dier". */
  noun: string;
  /** Totale diepte (eenheden) vóór en na deze ronde. */
  depthBefore: number;
  depthAfter: number;
  /** Speel de intro-animatie af (net gegraven); false bij herladen. */
  animate: boolean;
  onNext: () => void;
  isLastRound: boolean;
}

/**
 * Onthulling: eerst de tier van deze ronde (groot, met een spreuk), daarna de details:
 * waarde en plek van het gekozen antwoord, de top 5, de tijdstraf en de bron.
 */
export function renderRevealScreen(options: RevealScreenOptions): HTMLElement {
  const { result, items, noun, depthBefore, depthAfter, animate, onNext, isLastRound } = options;
  const { stat, answerId, score } = result;
  const ranking = rankItems(stat, items);
  const top5 = topN(ranking, 5);
  const chosen = answerId ? rankOf(ranking, answerId) : undefined;
  const chosenItem = answerId ? items.find((c) => c.id === answerId) : undefined;
  const tier = tierFor(score.total);
  const dugKm = unitsToKm(depthAfter) - unitsToKm(depthBefore);
  const layer = layerAt(depthAfter);

  const quip = score.timedOut
    ? 'Tijd op: de schep bleef liggen.'
    : score.noData
      ? `Geen data voor ${chosenItem?.nameNl ?? `dit ${noun}`}, dus geen punten.`
      : tier.quip;

  const statusLine = score.timedOut
    ? `Geen ${noun} gekozen binnen de tijd.`
    : score.noData
      ? `Geen data bekend voor ${chosenItem?.nameNl ?? `dit ${noun}`}.`
      : chosen
        ? `${chosenItem!.nameNl}: ${formatValue(stat, chosen.value)} (plek ${chosen.rank} van ${ranking.length})`
        : `Geen ${noun} gekozen.`;

  const el = document.createElement('div');
  el.className = `reveal-screen${animate ? ' reveal-screen--animate' : ''}`;
  el.innerHTML = `
    <section class="panel tier" style="--tier-color: ${tier.color}">
      <p class="tier__name">${escapeHtml(tier.name.toUpperCase())}</p>
      ${chosenItem ? `<p class="tier__answer">“${escapeHtml(chosenItem.nameNl)}”</p>` : ''}
      <p class="tier__points">+${score.total} PUNTEN · ${escapeHtml(formatDepth(dugKm))} DIEPER</p>
      <p class="tier__quip">${escapeHtml(quip)}</p>
      <p class="tier__layer">Je zit nu in de <strong>${escapeHtml(layer.name.toLowerCase())}</strong>: ${escapeHtml(layer.description)}.</p>
    </section>
    <section class="panel reveal-details">
      <h2 class="question question--small">${escapeHtml(stat.question)}</h2>
      <p class="reveal-status">${escapeHtml(statusLine)}</p>
      <div class="score-bar" role="img" aria-label="${score.total} van 1000 punten">
        <div class="score-bar__fill" style="width: ${(score.total / 1000) * 100}%; --tier-color: ${tier.color}"></div>
      </div>
      ${score.penalty > 0 ? `<p class="score-line">${score.base} − ${score.penalty} tijdstraf = <strong>${score.total}</strong></p>` : ''}
      <ol class="top5">
        ${top5
          .map(
            (r) => `
          <li class="top5__item${answerId === r.item.id ? ' top5__item--chosen' : ''}">
            <span class="top5__rank">${r.rank}</span>
            <span class="top5__name">${escapeHtml(r.item.nameNl)}</span>
            <span class="top5__value">${escapeHtml(formatValue(stat, r.value))}</span>
          </li>`,
          )
          .join('')}
      </ol>
      <p class="source">Bron: ${escapeHtml(stat.source)}, ${stat.year}</p>
    </section>
    <button type="button" class="btn btn--primary next-btn">${isLastRound ? 'BEKIJK JE DIEPTE ▼' : 'DIEPER ▼'}</button>
  `;

  const next = el.querySelector<HTMLButtonElement>('.next-btn')!;
  next.addEventListener('click', onNext);
  queueMicrotask(() => next.focus({ preventScroll: true }));

  return el;
}
