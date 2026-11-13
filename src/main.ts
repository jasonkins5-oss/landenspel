import './style.css';
import { countries, stats } from './data';
import { utcDateKey } from './core/rng';
import { browserStore } from './core/storage';
import { startApp } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app')!;

// `?date=YYYY-MM-DD` overschrijft de dag, alleen voor handmatig testen.
const forcedDate = new URLSearchParams(location.search).get('date');
const dateKey = forcedDate ?? utcDateKey();

app.innerHTML = `
  <header class="app-header">
    <h1>Landenspel</h1>
    <button type="button" class="help-btn" id="help-btn" aria-label="Uitleg">?</button>
  </header>
  <main id="game-root" aria-live="polite"></main>
  <footer class="app-footer muted">
    Data: <a href="https://data.worldbank.org/" rel="noopener" target="_blank">World Bank</a> (CC BY 4.0)
  </footer>
`;

startApp({
  root: document.querySelector<HTMLElement>('#game-root')!,
  countries,
  stats,
  dateKey,
  store: browserStore(),
  helpButton: document.querySelector<HTMLElement>('#help-btn'),
});
