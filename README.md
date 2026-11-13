# Landenspel

Dagelijks browser-schattingsspel: 7 vragen per dag van de vorm *"Welk land heeft de hoogste …?"*.
Typ een land, en scoor op basis van hoe dicht de waarde van jouw land bij de nummer 1 ligt
(log-schaal), min een tijdstraf. Geen backend: Vite + TypeScript, alle data in JSON.

De spelregels en de fasering staan in [PLAN.md](PLAN.md).

## Ontwikkelen

Vereist Node 20 of hoger.

```bash
npm install
npm run dev          # dev-server op http://localhost:5173
npm test             # Vitest
npm run lint
npm run build        # tsc --noEmit + vite build → dist/
```

Handig bij testen: `http://localhost:5173/?date=2026-11-14` forceert een andere dag.
De opslag staat in `localStorage` onder de sleutels `landenspel:*`.

## Data

De statistieken komen van de [World Bank](https://data.worldbank.org/) (CC BY 4.0) en staan
gecommit in `src/data/stats.json`; de app haalt tijdens het spelen niets op.

```bash
npm run data:fetch             # haalt alle indicatoren uit scripts/indicators.ts op (gecachet in .cache/)
npm run data:fetch -- --refresh  # negeert de cache
npm run data:validate          # controleert de JSON en toont per statistiek de K en de scoreverdeling
```

Een statistiek toevoegen: een regel in `scripts/indicators.ts`, dan `npm run data:fetch`.
Het script slaat een indicator automatisch over als er geen jaar is met minstens 150 landen,
als er negatieve waarden in zitten of als de eerste plaats gedeeld wordt.

## Deploy

`.github/workflows/deploy.yml` draait lint, validatie, tests en build bij elke push en
publiceert `dist/` naar GitHub Pages bij een push naar `main`. Zet in de repository-instellingen
**Settings → Pages → Source** op *GitHub Actions*. De build gebruikt relatieve paden (`base: './'`),
dus hij werkt ook onder `https://<gebruiker>.github.io/<repo>/`.
