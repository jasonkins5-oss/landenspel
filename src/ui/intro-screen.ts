import {
  GRACE_SECONDS,
  MAX_PENALTY,
  PENALTY_PER_SECOND,
  TIME_LIMIT_SECONDS,
} from '../core/scoring';
import { ROUNDS_PER_PUZZLE } from '../core/puzzle';
import { MAX_TOTAL_SCORE } from '../core/game';
import { EARTH_RADIUS_KM, TIERS, formatDepth } from '../core/depth';
import { escapeHtml } from './html';

export interface IntroScreenOptions {
  /** Tekst op de knop: "Begin te graven" bij een nieuwe puzzel, "Terug" vanuit de help. */
  buttonLabel: string;
  onContinue: () => void;
}

/** Uitlegscherm. Wordt getoond bij het eerste bezoek en via de help-knop. */
export function renderIntroScreen(options: IntroScreenOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'intro-screen';
  el.innerHTML = `
    <section class="panel intro-panel">
      <h2 class="section-label">HOE WERKT HET?</h2>
      <ol class="intro-steps">
        <li>Kies een categorie. Je krijgt ${ROUNDS_PER_PUZZLE} vragen, zoals <em>"Welk land heeft de meeste inwoners?"</em> of <em>"Welk dier is het snelst?"</em></li>
        <li>Typ één antwoord en druk op <strong>GRAAF</strong>. Hoe dichter jouw antwoord bij de nummer 1 zit, hoe meer punten (maximaal 1000).</li>
        <li>Elk punt graaft je dieper de aarde in. Een perfecte puzzel (${MAX_TOTAL_SCORE}) eindigt in het middelpunt, op ${escapeHtml(formatDepth(EARTH_RADIUS_KM))}.</li>
        <li>Na ${GRACE_SECONDS} seconden kost elke seconde ${PENALTY_PER_SECOND} punten, tot ${MAX_PENALTY}. Na ${TIME_LIMIT_SECONDS} seconden is de ronde voorbij.</li>
      </ol>
      <ul class="tier-legend" aria-label="Wat je per vraag kunt halen">
        ${TIERS.map(
          (t) =>
            `<li style="--tier-color: ${t.color}"><span class="tier-legend__name">${escapeHtml(t.name)}</span><span class="tier-legend__min">${t.min === 0 ? '0' : `${t.min}+`}</span></li>`,
        ).join('')}
      </ul>
      <p class="intro-note">Elke dag een nieuwe puzzel per categorie. In de modus <strong>Onbeperkt</strong> speel je zoveel puzzels als je wilt.</p>
      <button type="button" class="btn btn--primary intro-btn">${escapeHtml(options.buttonLabel)}</button>
    </section>
  `;
  const btn = el.querySelector<HTMLButtonElement>('.intro-btn')!;
  btn.addEventListener('click', options.onContinue);
  queueMicrotask(() => btn.focus({ preventScroll: true }));
  return el;
}
