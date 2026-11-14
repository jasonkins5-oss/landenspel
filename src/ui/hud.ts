import { formatDepth, tierFor, unitsToKm } from '../core/depth';
import { ICON_MENU, ICON_SOUND_OFF, ICON_SOUND_ON } from './sprites';

export interface HudState {
  /** Diepte in eenheden (= punten tot nu toe). */
  depthUnits: number;
  score: number;
  /** Scores van de gespeelde rondes. */
  results: readonly number[];
  totalRounds: number;
  /** Index van de ronde die nu loopt; gelijk aan results.length tijdens een ronde. */
  currentRound: number;
}

export interface Hud {
  el: HTMLElement;
  /** Toont of verbergt de spelstatus (diepte, voortgang, score). */
  setPlaying(playing: boolean): void;
  update(state: HudState): void;
  setSound(on: boolean): void;
}

export interface HudOptions {
  onHome: () => void;
  onHelp: () => void;
  onToggleSound: () => void;
  soundOn: boolean;
}

export function createHud(options: HudOptions): Hud {
  const el = document.createElement('header');
  el.className = 'hud';
  el.innerHTML = `
    <h1 class="visually-hidden">CORE DIVE</h1>
    <button type="button" class="hud__btn hud__home" aria-label="Menu">${ICON_MENU}</button>
    <div class="hud__stats" hidden>
      <div class="hud__panel hud__depth">
        <span class="hud__label">DEPTH</span>
        <span class="hud__value hud__value--cyan" data-depth>0 m</span>
      </div>
      <div class="hud__progress">
        <ol class="hud__blocks" aria-hidden="true"></ol>
        <span class="hud__label" data-round></span>
      </div>
      <div class="hud__panel hud__score">
        <span class="hud__label">SCORE</span>
        <span class="hud__value hud__value--pink" data-score>0</span>
      </div>
    </div>
    <div class="hud__right">
      <button type="button" class="hud__btn hud__sound" aria-pressed="false" aria-label="Sound">${ICON_SOUND_OFF}</button>
      <button type="button" class="hud__btn hud__help" aria-label="How to play">?</button>
    </div>
  `;

  const stats = el.querySelector<HTMLElement>('.hud__stats')!;
  const depthEl = el.querySelector<HTMLElement>('[data-depth]')!;
  const scoreEl = el.querySelector<HTMLElement>('[data-score]')!;
  const roundEl = el.querySelector<HTMLElement>('[data-round]')!;
  const blocks = el.querySelector<HTMLOListElement>('.hud__blocks')!;
  const soundBtn = el.querySelector<HTMLButtonElement>('.hud__sound')!;

  el.querySelector('.hud__home')!.addEventListener('click', options.onHome);
  el.querySelector('.hud__help')!.addEventListener('click', options.onHelp);
  soundBtn.addEventListener('click', options.onToggleSound);

  function setSound(on: boolean) {
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
  }
  setSound(options.soundOn);

  return {
    el,
    setSound,
    setPlaying(playing) {
      stats.hidden = !playing;
    },
    update(state) {
      depthEl.textContent = formatDepth(unitsToKm(state.depthUnits));
      scoreEl.textContent = String(state.score);
      const shown = Math.min(state.currentRound + 1, state.totalRounds);
      roundEl.textContent = `PROMPT ${shown} OF ${state.totalRounds}`;
      blocks.innerHTML = Array.from({ length: state.totalRounds }, (_, i) => {
        const score = state.results[i];
        if (score !== undefined)
          return `<li class="hud__block hud__block--done" style="--c: ${tierFor(score).color}"></li>`;
        return `<li class="hud__block${i === state.currentRound ? ' hud__block--current' : ''}"></li>`;
      }).join('');
    },
  };
}
