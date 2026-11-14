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

export interface ArchiveDay {
  dateKey: string;
  /** Puzzelnummer, bv. 3. */
  number: number;
  /** Eindscore als die bekend is. */
  score: number | null;
  /** Aantal gespeelde rondes van een archiefpuzzel die nog loopt. */
  roundsPlayed: number;
}

export interface ArchiveView {
  category: Category;
  days: readonly ArchiveDay[];
  onCategory: (category: Category) => void;
  onSelect: (dateKey: string) => void;
}

export interface CategoryScreenOptions {
  categories: readonly Category[];
  mode: GameMode;
  statusOf: (category: Category, mode: GameMode) => CategoryStatus;
  onSelect: (category: Category, mode: GameMode) => void;
  onModeChange: (mode: GameMode) => void;
  /** Alleen nodig in de modus 'archive'. */
  archive?: ArchiveView;
}

const MODE_HINTS: Record<GameMode, string> = {
  daily: 'Elke dag één puzzel per categorie, voor iedereen dezelfde. Telt mee voor je streak.',
  unlimited:
    'Zoveel puzzels als je wilt. Telt niet mee voor je streak; deel een puzzel via de link.',
  archive: 'Speel een dagpuzzel die je gemist hebt. Telt niet mee voor je streak.',
};

const dayFormat = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function statusText(mode: GameMode, s: CategoryStatus): string {
  if (mode === 'unlimited') {
    if (s.roundsPlayed === 0) return `Puzzel #${s.puzzleNumber ?? 1} staat klaar`;
    return `Puzzel #${s.puzzleNumber}: vraag ${s.roundsPlayed + 1} van ${s.totalRounds}`;
  }
  if (s.roundsPlayed === 0) return 'Nog niet gespeeld';
  if (s.roundsPlayed >= s.totalRounds) return `Klaar: ${s.score} punten`;
  return `Bezig: vraag ${s.roundsPlayed + 1} van ${s.totalRounds}`;
}

function dayStatus(day: ArchiveDay): string {
  if (day.score !== null) return `${day.score} punten`;
  if (day.roundsPlayed > 0) return `Bezig: vraag ${day.roundsPlayed + 1}`;
  return 'Nog niet gespeeld';
}

function renderCategoryCards(options: CategoryScreenOptions): string {
  const { mode } = options;
  return `
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
    </ul>`;
}

function renderArchive(categories: readonly Category[], archive: ArchiveView): string {
  const tabs = categories
    .map(
      (c) =>
        `<button type="button" role="radio" class="archive-tab" data-archive-cat="${c.id}" aria-checked="${c.id === archive.category.id}">${c.emoji} ${escapeHtml(c.title.toUpperCase())}</button>`,
    )
    .join('');
  const days =
    archive.days.length === 0
      ? '<p class="archive-empty">Het archief is nog leeg. Morgen staat de puzzel van vandaag hier.</p>'
      : `<ul class="archive-list">
          ${archive.days
            .map(
              (d) => `
            <li>
              <button type="button" class="archive-day${d.score !== null ? ' archive-day--done' : ''}" data-date="${d.dateKey}">
                <span class="archive-day__number">#${d.number}</span>
                <span class="archive-day__date">${escapeHtml(dayFormat.format(new Date(`${d.dateKey}T00:00:00Z`)))}</span>
                <span class="archive-day__status">${escapeHtml(dayStatus(d))}</span>
              </button>
            </li>`,
            )
            .join('')}
        </ul>`;
  return `
    <h2 class="section-label">ARCHIEF</h2>
    <div class="archive-tabs" role="radiogroup" aria-label="Categorie">${tabs}</div>
    ${days}`;
}

/** Startscherm: titel, modus (dagelijks, onbeperkt of archief) en de keuzes binnen die modus. */
export function renderCategoryScreen(options: CategoryScreenOptions): HTMLElement {
  const { mode, archive } = options;
  const el = document.createElement('div');
  el.className = 'category-screen';
  const modes: [GameMode, string][] = [
    ['daily', 'DAGELIJKS'],
    ['unlimited', 'ONBEPERKT'],
    ['archive', 'ARCHIEF'],
  ];
  el.innerHTML = `
    <div class="title-block">
      <p class="logo" aria-hidden="true">LANDENSPEL</p>
      <p class="logo-sub">GRAAF NAAR DE KERN</p>
      <p class="logo-tag">hoe beter je antwoord · hoe dieper je graaft</p>
    </div>
    <div class="start-panel">
      <div class="mode-switch" role="radiogroup" aria-label="Spelmodus">
        ${modes
          .map(
            ([m, label]) =>
              `<button type="button" role="radio" class="mode-switch__btn" data-mode="${m}" aria-checked="${mode === m}">${label}</button>`,
          )
          .join('')}
      </div>
      <p class="mode-hint">${MODE_HINTS[mode]}</p>
      ${mode === 'archive' && archive ? renderArchive(options.categories, archive) : renderCategoryCards(options)}
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
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.archive-tab')) {
    btn.addEventListener('click', () => {
      const category = options.categories.find((c) => c.id === btn.dataset.archiveCat);
      if (category) archive?.onCategory(category);
    });
  }
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.archive-day')) {
    btn.addEventListener('click', () => archive?.onSelect(btn.dataset.date!));
  }
  return el;
}
