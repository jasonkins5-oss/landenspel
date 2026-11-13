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

Handig bij testen: `http://localhost:5173/?date=2026-11-14` forceert een andere dag,
`?cat=dieren` opent direct de dagpuzzel van een categorie en `?cat=dieren&game=3` de onbeperkte
puzzel #3. De opslag staat in `localStorage` onder de sleutels
`landenspel:*`, per categorie.

## Data

Er zijn drie categorieën (`src/data/index.ts`); de app haalt tijdens het spelen niets op.

- **Landen**: World Bank (CC BY 4.0), gegenereerd in `src/data/countries.json` en
  `src/data/categories/landen-stats.json`.
- **Dieren**: handgemaakt in `src/data/categories/dieren.json` (eigen itemlijst met aliassen).
- **Sport**: handgemaakt in `src/data/categories/sport-stats.json`, met de landenlijst als antwoorden.

De handgemaakte waarden komen uit Wikipedia en zijn afgerond; ze dienen als spelgegevens, niet als
naslagwerk. Elke statistiek heeft een `source` en `sourceUrl`.

```bash
npm run data:fetch             # haalt alle indicatoren uit scripts/indicators.ts op (gecachet in .cache/)
npm run data:fetch -- --refresh  # negeert de cache
npm run data:validate          # controleert alle categorieën en toont per statistiek de K en de scoreverdeling
```

Een landenstatistiek toevoegen: een regel in `scripts/indicators.ts`, dan `npm run data:fetch`.
Het script slaat een indicator automatisch over als er geen jaar is met minstens 150 landen,
als er negatieve waarden in zitten of als de eerste plaats gedeeld wordt. Een dieren- of
sportvraag toevoegen: een `Stat` in de JSON met waarden per item-id, dan `npm run data:validate`
(minimale dekking per categorie staat in `minCoverage`).

## Deploy

`.github/workflows/deploy.yml` draait lint, validatie, tests en build bij elke push en
publiceert `dist/` naar GitHub Pages bij een push naar `main`. Zet in de repository-instellingen
**Settings → Pages → Source** op *GitHub Actions*. De build gebruikt relatieve paden (`base: './'`),
dus hij werkt ook onder `https://<gebruiker>.github.io/<repo>/`.
