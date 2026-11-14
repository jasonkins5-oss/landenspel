import type { GameMode } from '../core/game';
import { escapeHtml } from './html';

export interface ModeStatus {
  /** Kop van de kaart, bv. "Today's dive #2" of "Dive #7". */
  title: string;
  /** Stand, bv. "Not played yet", "Prompt 3 of 7", "Done: 4410 points". */
  status: string;
  /** Tekst op de knop. */
  action: string;
}

export interface ArchiveDay {
  dateKey: string;
  number: number;
  score: number | null;
  roundsPlayed: number;
}

export interface StartScreenOptions {
  mode: GameMode;
  /** Kaart voor Daily en Unlimited. */
  status: ModeStatus;
  /** Lijst voor Archive. */
  archiveDays: readonly ArchiveDay[];
  promptCount: number;
  onModeChange: (mode: GameMode) => void;
  onStart: () => void;
  onArchiveSelect: (dateKey: string) => void;
}

const MODE_HINTS: Record<GameMode, string> = {
  daily: 'Seven prompts a day, the same for everyone. Counts towards your streak.',
  unlimited: 'Endless numbered dives. Share a dive with its link. No streak.',
  archive: 'Catch up on daily dives you missed. No streak.',
};

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function dayStatus(day: ArchiveDay): string {
  if (day.score !== null) return `${day.score} points`;
  if (day.roundsPlayed > 0) return `Prompt ${day.roundsPlayed + 1} of 7`;
  return 'Not played yet';
}

/** Startscherm: titel, modus (daily, unlimited, archive) en wat je in die modus kunt doen. */
export function renderStartScreen(options: StartScreenOptions): HTMLElement {
  const { mode, status, archiveDays } = options;
  const el = document.createElement('div');
  el.className = 'start-screen';
  const modes: [GameMode, string][] = [
    ['daily', 'DAILY'],
    ['unlimited', 'UNLIMITED'],
    ['archive', 'ARCHIVE'],
  ];

  const body =
    mode === 'archive'
      ? archiveDays.length === 0
        ? '<p class="archive-empty">The archive is empty for now. Tomorrow, today’s dive will be here.</p>'
        : `<ul class="archive-list">
            ${archiveDays
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
          </ul>`
      : `<section class="panel dive-card">
          <p class="dive-card__title">${escapeHtml(status.title)}</p>
          <p class="dive-card__status">${escapeHtml(status.status)}</p>
          <button type="button" class="btn btn--primary dive-card__start">▼ ${escapeHtml(status.action)} ▼</button>
        </section>`;

  el.innerHTML = `
    <div class="title-block">
      <p class="logo" aria-hidden="true">CORE DIVE</p>
      <p class="logo-sub">DIG TO THE CENTRE OF THE EARTH</p>
      <p class="logo-tag">the rarer your answer · the deeper you dig</p>
    </div>
    <div class="start-panel">
      <div class="mode-switch" role="radiogroup" aria-label="Game mode">
        ${modes
          .map(
            ([m, label]) =>
              `<button type="button" role="radio" class="mode-switch__btn" data-mode="${m}" aria-checked="${mode === m}">${label}</button>`,
          )
          .join('')}
      </div>
      <p class="mode-hint">${MODE_HINTS[mode]}</p>
      ${body}
      <p class="pool-note">${options.promptCount} prompts in the pool, from dog breeds to moons of Saturn.</p>
    </div>
  `;

  for (const btn of el.querySelectorAll<HTMLButtonElement>('.mode-switch__btn')) {
    btn.addEventListener('click', () => options.onModeChange(btn.dataset.mode as GameMode));
  }
  el.querySelector<HTMLButtonElement>('.dive-card__start')?.addEventListener(
    'click',
    options.onStart,
  );
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.archive-day')) {
    btn.addEventListener('click', () => options.onArchiveSelect(btn.dataset.date!));
  }
  return el;
}
