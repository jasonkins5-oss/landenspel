import type { Category } from '../data/types';
import type { GameMode } from '../core/game';
import { escapeHtml } from './html';

export interface CategoryStatus {
  /** Aantal gespeelde rondes (0 = nog niet begonnen). */
  roundsPlayed: number;
  totalRounds: number;
  /** Score tot nu toe; definitief als roundsPlayed === totalRounds. */
  score: number;
  /** Onbeperkt: het nummer van de puzzel waar je staat. */
  puzzleNumber?: number;
}

export interface CategoryScreenOptions {
  categories: readonly Category[];
  mode: GameMode;
  statusOf: (category: Category, mode: GameMode) => CategoryStatus;
  onSelect: (category: Category, mode: GameMode) => void;
  onModeChange: (mode: GameMode) => void;
}

function statusText(mode: GameMode, s: CategoryStatus): string {
  if (mode === 'unlimited') {
    if (s.roundsPlayed === 0) return `Puzzel #${s.puzzleNumber ?? 1} staat klaar`;
    return `Puzzel #${s.puzzleNumber}: vraag ${s.roundsPlayed + 1} van ${s.totalRounds}`;
  }
  if (s.roundsPlayed === 0) return 'Nog niet gespeeld';
  if (s.roundsPlayed >= s.totalRounds) return `Klaar: ${s.score} punten`;
  return `Bezig: vraag ${s.roundsPlayed + 1} van ${s.totalRounds}`;
}

/** Startscherm: titel, modus (dagelijks of onbeperkt) en één kaart per categorie, met de stand. */
export function renderCategoryScreen(options: CategoryScreenOptions): HTMLElement {
  const { mode } = options;
  const el = document.createElement('div');
  el.className = 'category-screen';
  el.innerHTML = `
    <div class="title-block">
      <p class="logo" aria-hidden="true">LANDENSPEL</p>
      <p class="logo-sub">GRAAF NAAR DE KERN</p>
      <p class="logo-tag">hoe beter je antwoord · hoe dieper je graaft</p>
    </div>
    <div class="start-panel">
      <div class="mode-switch" role="radiogroup" aria-label="Spelmodus">
        <button type="button" role="radio" class="mode-switch__btn" data-mode="daily" aria-checked="${mode === 'daily'}">DAGELIJKS</button>
        <button type="button" role="radio" class="mode-switch__btn" data-mode="unlimited" aria-checked="${mode === 'unlimited'}">ONBEPERKT</button>
      </div>
      <p class="mode-hint">${
        mode === 'daily'
          ? 'Elke dag één puzzel per categorie, voor iedereen dezelfde. Telt mee voor je streak.'
          : 'Zoveel puzzels als je wilt. Telt niet mee voor je streak; deel een puzzel via de link.'
      }</p>
      <h2 class="section-label">KIES EEN CATEGORIE</h2>
      <ul class="category-list">
        ${options.categories
          .map((c) => {
            const status = options.statusOf(c, mode);
            const done = status.roundsPlayed >= status.totalRounds;
            return `
          <li>
            <button type="button" class="category-card${done ? ' category-card--done' : ''}" data-id="${c.id}">
              <span class="category-card__emoji" aria-hidden="true">${c.emoji}</span>
              <span class="category-card__body">
                <span class="category-card__title">${escapeHtml(c.title.toUpperCase())}</span>
                <span class="category-card__tagline">${escapeHtml(c.tagline)}</span>
                <span class="category-card__status">${escapeHtml(statusText(mode, status))}</span>
              </span>
              <span class="category-card__go" aria-hidden="true">▼</span>
            </button>
          </li>`;
          })
          .join('')}
      </ul>
    </div>
  `;

  for (const btn of el.querySelectorAll<HTMLButtonElement>('.mode-switch__btn')) {
    btn.addEventListener('click', () => options.onModeChange(btn.dataset.mode as GameMode));
  }
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.category-card')) {
    btn.addEventListener('click', () => {
      const category = options.categories.find((c) => c.id === btn.dataset.id);
      if (category) options.onSelect(category, mode);
    });
  }
  return el;
}
