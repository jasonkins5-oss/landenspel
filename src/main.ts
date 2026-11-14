import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import './style.css';
import { loadAnswers, prompts } from './data';
import type { PuzzleRef } from './core/game';
import { noBackend, supabaseBackend } from './core/counts';
import { parseArchiveDate, utcDateKey } from './core/rng';
import { browserStore } from './core/storage';
import { startApp } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app')!;

const params = new URLSearchParams(location.search);
// `?date=YYYY-MM-DD` overschrijft "vandaag", alleen voor handmatig testen.
const dateKey = params.get('date') ?? utcDateKey();
// `?dive=42` opent dive #42; `?archive=2026-11-13` de dagpuzzel van die datum.
const diveParam = Number(params.get('dive'));
const archiveDate = parseArchiveDate(params.get('archive'), dateKey);
const initialRef: PuzzleRef | null =
  Number.isInteger(diveParam) && diveParam > 0
    ? { mode: 'unlimited', number: diveParam }
    : archiveDate
      ? { mode: 'archive', dateKey: archiveDate }
      : null;

// Spelerstellingen via Supabase als die is ingesteld; anders alleen de schatting uit bekendheid.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const counts = supabaseUrl && supabaseKey ? supabaseBackend(supabaseUrl, supabaseKey) : noBackend();

app.innerHTML = `
  <div id="scene-root"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <div id="hud-root"></div>
  <main id="game-root" aria-live="polite"></main>
  <footer class="app-footer">
    Answers from <a href="https://www.wikidata.org/" rel="noopener" target="_blank">Wikidata</a> (CC0)
  </footer>
`;

function urlFor(ref: PuzzleRef | null): URL {
  const url = new URL(location.href);
  url.searchParams.delete('dive');
  url.searchParams.delete('archive');
  if (ref?.mode === 'unlimited') url.searchParams.set('dive', String(ref.number));
  if (ref?.mode === 'archive') url.searchParams.set('archive', ref.dateKey);
  return url;
}

startApp({
  root: document.querySelector<HTMLElement>('#game-root')!,
  hudRoot: document.querySelector<HTMLElement>('#hud-root')!,
  sceneRoot: document.querySelector<HTMLElement>('#scene-root')!,
  prompts,
  loadAnswers,
  counts,
  dateKey,
  store: browserStore(),
  initialRef,
  onPuzzleChange: (ref) => history.replaceState(null, '', urlFor(ref)),
  shareUrlFor: (ref) => {
    const url = urlFor(ref);
    url.searchParams.delete('date');
    return url.toString();
  },
});
