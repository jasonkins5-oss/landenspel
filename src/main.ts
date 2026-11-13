import './style.css';
import { categories, findCategory } from './data';
import { utcDateKey } from './core/rng';
import { browserStore } from './core/storage';
import { startApp } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app')!;

const params = new URLSearchParams(location.search);
// `?date=YYYY-MM-DD` overschrijft de dag, alleen voor handmatig testen.
const dateKey = params.get('date') ?? utcDateKey();
// `?cat=dieren` opent direct een categorie.
const initialCategory = findCategory(params.get('cat')) ?? null;

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

startApp({
  root: document.querySelector<HTMLElement>('#game-root')!,
  categories,
  dateKey,
  store: browserStore(),
  helpButton: document.querySelector<HTMLElement>('#help-btn'),
  initialCategory,
  onCategoryChange: (category) => {
    const url = new URL(location.href);
    if (category) url.searchParams.set('cat', category.id);
    else url.searchParams.delete('cat');
    history.replaceState(null, '', url);
  },
});
