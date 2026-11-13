import { GRACE_SECONDS, MAX_PENALTY, PENALTY_PER_SECOND, TIME_LIMIT_SECONDS } from '../core/scoring';
import { ROUNDS_PER_PUZZLE } from '../core/puzzle';

export interface IntroScreenOptions {
  /** Tekst op de knop: "Start" bij een nieuwe puzzel, "Terug" vanuit de help. */
  buttonLabel: string;
  onContinue: () => void;
}

/** Uitlegscherm. Wordt getoond bij het eerste bezoek en via de help-knop. */
export function renderIntroScreen(options: IntroScreenOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'intro-screen';
  el.innerHTML = `
    <h2>Hoe werkt het?</h2>
    <ol class="intro-steps">
      <li>Elke dag ${ROUNDS_PER_PUZZLE} vragen, voor iedereen dezelfde: <em>"Welk land heeft de hoogste …?"</em></li>
      <li>Typ een land en bevestig. Je hebt één poging per vraag.</li>
      <li>Hoe dichter de waarde van jouw land bij de nummer 1 ligt, hoe meer punten (maximaal 1000).</li>
      <li>Na ${GRACE_SECONDS} seconden kost elke seconde ${PENALTY_PER_SECOND} punten, tot ${MAX_PENALTY}. Na ${TIME_LIMIT_SECONDS} seconden is de ronde voorbij.</li>
    </ol>
    <p class="muted">De schaal is logaritmisch: een land met een tiende van de topwaarde scoort dus nog flink, een land met een duizendste niet.</p>
    <button type="button" class="intro-btn">${options.buttonLabel}</button>
  `;
  const btn = el.querySelector<HTMLButtonElement>('.intro-btn')!;
  btn.addEventListener('click', options.onContinue);
  queueMicrotask(() => btn.focus());
  return el;
}
