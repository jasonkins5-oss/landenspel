import { ROUNDS_PER_PUZZLE } from '../core/puzzle';
import { MAX_TOTAL_SCORE } from '../core/game';
import { EARTH_RADIUS_KM, TIERS, formatDepth } from '../core/depth';
import { TIME_LIMIT_SECONDS } from './round-screen';
import { escapeHtml } from './html';

export interface IntroScreenOptions {
  buttonLabel: string;
  onContinue: () => void;
}

/** Uitlegscherm. Wordt getoond bij het eerste bezoek en via de help-knop. */
export function renderIntroScreen(options: IntroScreenOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'intro-screen';
  el.innerHTML = `
    <section class="panel intro-panel">
      <h2 class="section-label">HOW TO PLAY</h2>
      <ol class="intro-steps">
        <li>Each dive has ${ROUNDS_PER_PUZZLE} prompts, like <em>“Name a dog breed”</em> or <em>“Name a cheese”</em>.</li>
        <li>Type <strong>one answer</strong> and hit <strong>DIG</strong>. The rarer your answer, the more points (up to 1,000). Labrador is easy. Pumi is deep.</li>
        <li>Every point digs you deeper. A perfect dive (${MAX_TOTAL_SCORE.toLocaleString('en-GB')}) reaches the centre of the Earth, ${escapeHtml(formatDepth(EARTH_RADIUS_KM))} down.</li>
        <li>You have ${TIME_LIMIT_SECONDS} seconds per prompt. If we don’t know your answer, you can simply try another.</li>
      </ol>
      <ul class="tier-legend" aria-label="What you can score per prompt">
        ${TIERS.map(
          (t) =>
            `<li style="--tier-color: ${t.color}"><span class="tier-legend__name">${escapeHtml(t.name)}</span><span class="tier-legend__min">${t.min === 0 ? '0' : `${t.min}+`}</span></li>`,
        ).join('')}
      </ul>
      <p class="intro-note">Rarity comes from what other divers answer, combined with how well known each answer is. Play the <strong>Daily</strong> dive, endless <strong>Unlimited</strong> dives, or catch up in the <strong>Archive</strong>.</p>
      <button type="button" class="btn btn--primary intro-btn">${escapeHtml(options.buttonLabel)}</button>
    </section>
  `;
  const btn = el.querySelector<HTMLButtonElement>('.intro-btn')!;
  btn.addEventListener('click', options.onContinue);
  queueMicrotask(() => btn.focus({ preventScroll: true }));
  return el;
}
