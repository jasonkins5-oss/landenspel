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
  <header class="app-header">
    <h1><a href="./" class="home-link">Landenspel</a></h1>
    <button type="button" class="help-btn" id="help-btn" aria-label="Uitleg">?</button>
  </header>
  <main id="game-root" aria-live="polite"></main>
  <footer class="app-footer muted">
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
  categories,
  dateKey,
  store: browserStore(),
  helpButton: document.querySelector<HTMLElement>('#help-btn'),
  initialCategory,
  initialGameNumber,
  onPuzzleChange: (category, ref) => history.replaceState(null, '', urlFor(category, ref)),
  shareUrlFor: (category, ref) => {
    const url = urlFor(category, ref);
    url.searchParams.delete('date');
    return url.toString();
  },
});
