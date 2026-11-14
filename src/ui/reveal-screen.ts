import type { Answer } from '../core/answers';
import type { RoundResult } from '../core/game';
import { formatDepth, layerAt, tierFor, unitsToKm } from '../core/depth';
import { normalize } from '../core/match';
import { escapeHtml } from './html';

export interface RevealScreenOptions {
  prompt: string;
  result: RoundResult;
  /** Wat de speler typte (alleen direct na het antwoorden bekend). */
  typed?: string;
  /** De meest gegeven antwoorden, met aandeel (0–1). */
  common: readonly { answer: Answer; share: number }[];
  /** Een paar obscure antwoorden die ook hadden gekund. */
  deepCuts: readonly Answer[];
  /** Totale diepte (eenheden) vóór en na deze ronde. */
  depthBefore: number;
  depthAfter: number;
  /** true als de tellingen van echte spelers komen (anders alleen de schatting). */
  liveCounts: boolean;
  /** Aantal spelersantwoorden op deze vraag tot nu toe. */
  answersSoFar: number;
  /** Speel de intro-animatie af (net gegraven); false bij herladen. */
  animate: boolean;
  onNext: () => void;
  isLastRound: boolean;
}

/**
 * Vanaf zoveel spelersantwoorden zeggen we "most common"; daarvoor bepaalt vooral de bekendheid
 * de volgorde, en heet het eerlijker "well-known".
 */
const ENOUGH_ANSWERS = 30;

const pct = (x: number) => {
  const p = x * 100;
  if (p >= 99.5 && p < 100) return '99.5%';
  if (p > 0 && p < 1) return '<1%';
  return `${Math.round(p)}%`;
};

/**
 * Onthulling: eerst de tier van deze ronde (groot, met een spreuk), daarna de context: hoe
 * zeldzaam het antwoord is, wat de meeste mensen zeggen, en een paar deep cuts.
 */
export function renderRevealScreen(options: RevealScreenOptions): HTMLElement {
  const { prompt, result, typed, common, deepCuts, depthBefore, depthAfter, animate, isLastRound } =
    options;
  const tier = tierFor(result.points);
  const dugKm = unitsToKm(depthAfter) - unitsToKm(depthBefore);
  const layer = layerAt(depthAfter);
  const timedOut = result.answerId === null;

  // Toon wat de speler typte; noem de officiële naam erbij als die echt anders is.
  const shown = typed ?? result.answer ?? '';
  // "Luxo Jr" vs "Luxo Jr." of "pad thai" vs "Pad thai" is niet de moeite van vermelden.
  const official =
    result.answer && typed && normalize(result.answer) !== normalize(typed) ? result.answer : null;

  const el = document.createElement('div');
  el.className = `reveal-screen${animate ? ' reveal-screen--animate' : ''}`;
  el.innerHTML = `
    <section class="panel tier" style="--tier-color: ${tier.color}">
      <p class="tier__name">${escapeHtml(tier.name.toUpperCase())}</p>
      ${shown ? `<p class="tier__answer">“${escapeHtml(shown)}”</p>` : ''}
      ${official ? `<p class="tier__official">counted as ${escapeHtml(official)}</p>` : ''}
      <p class="tier__points">+${result.points} PTS · ${escapeHtml(formatDepth(dugKm))} DEEPER</p>
      ${timedOut ? '' : `<p class="tier__rarity">Rarer than ${pct(result.rarerThan)} of answers</p>`}
      <p class="tier__quip">${escapeHtml(tier.quip)}</p>
      <p class="tier__layer">You are now in the <strong>${escapeHtml(layer.name.toLowerCase())}</strong>: ${escapeHtml(layer.description)}.</p>
    </section>
    <section class="panel reveal-details">
      <h2 class="question question--small">${escapeHtml(prompt)}</h2>
      <h3 class="reveal-label">${
        options.answersSoFar >= ENOUGH_ANSWERS ? 'MOST COMMON ANSWERS' : 'WELL-KNOWN ANSWERS'
      }</h3>
      <ol class="top5">
        ${common
          .map(
            (c, i) => `
          <li class="top5__item${c.answer.id === result.answerId ? ' top5__item--chosen' : ''}">
            <span class="top5__rank">${i + 1}</span>
            <span class="top5__name">${escapeHtml(c.answer.name)}</span>
            <span class="top5__value">${pct(c.share)}</span>
          </li>`,
          )
          .join('')}
      </ol>
      ${
        deepCuts.length > 0
          ? `<h3 class="reveal-label">DEEP CUTS YOU COULD HAVE DUG UP</h3>
             <p class="deep-cuts">${deepCuts.map((d) => escapeHtml(d.name)).join(' · ')}</p>`
          : ''
      }
      <p class="source">${
        options.liveCounts
          ? `Rarity from what other divers answered (${options.answersSoFar.toLocaleString('en-GB')} so far), plus how well known each answer is.`
          : 'Rarity estimated from how well known each answer is (player counts are offline).'
      } Answers from Wikidata.</p>
    </section>
    <button type="button" class="btn btn--primary next-btn">${isLastRound ? 'SEE HOW DEEP YOU GOT ▼' : 'DIVE DEEPER ▼'}</button>
  `;

  const next = el.querySelector<HTMLButtonElement>('.next-btn')!;
  next.addEventListener('click', options.onNext);
  queueMicrotask(() => next.focus({ preventScroll: true }));
  return el;
}
