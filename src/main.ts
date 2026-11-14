import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import './style.css';
import { categories, findCategory } from './data';
import { utcDateKey } from './core/rng';
import { browserStore } from './core/storage';
import { startApp } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app')!;

const params = new URLSearchParams(location.search);
// `?date=YYYY-MM-DD` overschrijft de dag, alleen voor handmatig testen.
const dateKey = params.get('date') ?? utcDateKey();
// `?cat=dieren` opent direct de dagpuzzel van een categorie; met `&game=42` de onbeperkte puzzel #42.
const initialCategory = findCategory(params.get('cat')) ?? null;
const gameParam = Number(params.get('game'));
const initialGameNumber = Number.isInteger(gameParam) && gameParam > 0 ? gameParam : null;

app.innerHTML = `
  <div id="scene-root"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <div id="hud-root"></div>
  <main id="game-root" aria-live="polite"></main>
  <footer class="app-footer">
    Data: ${categories
      .map((c) => c.attribution)
      .filter((a, i, all) => all.findIndex((b) => b.url === a.url) === i)
      .map((a) => `<a href="${a.url}" rel="noopener" target="_blank">${a.text}</a>`)
      .join(' · ')}
  </footer>
`;

function urlFor(
  category: { id: string } | null,
  ref: { mode: 'daily' } | { mode: 'unlimited'; number: number } | null,
): URL {
  const url = new URL(location.href);
  url.searchParams.delete('cat');
  url.searchParams.delete('game');
  if (category) url.searchParams.set('cat', category.id);
  if (ref?.mode === 'unlimited') url.searchParams.set('game', String(ref.number));
  return url;
}

startApp({
  root: document.querySelector<HTMLElement>('#game-root')!,
  hudRoot: document.querySelector<HTMLElement>('#hud-root')!,
  sceneRoot: document.querySelector<HTMLElement>('#scene-root')!,
  categories,
  dateKey,
  store: browserStore(),
  initialCategory,
  initialGameNumber,
  onPuzzleChange: (category, ref) => history.replaceState(null, '', urlFor(category, ref)),
  shareUrlFor: (category, ref) => {
    const url = urlFor(category, ref);
    url.searchParams.delete('date');
    return url.toString();
  },
});
