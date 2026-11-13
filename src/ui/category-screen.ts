import type { Category } from '../data/types';

export interface CategoryStatus {
  /** Aantal gespeelde rondes vandaag (0 = nog niet begonnen). */
  roundsPlayed: number;
  totalRounds: number;
  /** Score tot nu toe; definitief als roundsPlayed === totalRounds. */
  score: number;
}

export interface CategoryScreenOptions {
  categories: readonly Category[];
  statusOf: (category: Category) => CategoryStatus;
  onSelect: (category: Category) => void;
}

function statusText(s: CategoryStatus): string {
  if (s.roundsPlayed === 0) return 'Nog niet gespeeld';
  if (s.roundsPlayed >= s.totalRounds) return `Klaar: ${s.score} punten`;
  return `Bezig: ronde ${s.roundsPlayed + 1} van ${s.totalRounds}`;
}

/** Keuzescherm: één kaart per categorie, met de stand van vandaag. */
export function renderCategoryScreen(options: CategoryScreenOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'category-screen';
  el.innerHTML = `
    <h2>Kies een categorie</h2>
    <ul class="category-list">
      ${options.categories
        .map((c) => {
          const status = options.statusOf(c);
          const done = status.roundsPlayed >= status.totalRounds;
          return `
        <li>
          <button type="button" class="category-card${done ? ' category-card--done' : ''}" data-id="${c.id}">
            <span class="category-card__emoji" aria-hidden="true">${c.emoji}</span>
            <span class="category-card__body">
              <span class="category-card__title">${escapeHtml(c.title)}</span>
              <span class="category-card__tagline muted">${escapeHtml(c.tagline)}</span>
              <span class="category-card__status">${escapeHtml(statusText(status))}</span>
            </span>
          </button>
        </li>`;
        })
        .join('')}
    </ul>
  `;

  for (const btn of el.querySelectorAll<HTMLButtonElement>('.category-card')) {
    btn.addEventListener('click', () => {
      const category = options.categories.find((c) => c.id === btn.dataset.id);
      if (category) options.onSelect(category);
    });
  }
  queueMicrotask(() => el.querySelector<HTMLButtonElement>('.category-card')?.focus());
  return el;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
