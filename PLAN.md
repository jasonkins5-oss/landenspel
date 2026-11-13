# Dagelijks landen-schattingsspel — plan

## Spelregels (vastgesteld)

- Elke dag één puzzel van 7 rondes, voor iedereen gelijk. De dag wisselt om 00:00 UTC.
- Elke ronde vraagt: "Welk land heeft de hoogste X?" Elke statistiek komt maar één keer per puzzel voor.
- De vragen worden gekozen met een seed op basis van de UTC-datum (`YYYY-MM-DD`).
- Landenset: de VN-leden plus een paar bekende gebieden (Taiwan, Kosovo, Hongkong, Palestina).
- Alleen statistieken met strikt positieve waarden en één vast peiljaar.
- De speler heeft één poging per ronde en kiest via autocomplete (Nederlands en Engels, met aliassen en tolerantie voor tikfouten).
- **Score per ronde** (maximaal 1000):
  - `afstand = log10(beste / waarde)`
  - `basis = round(1000 × max(0, 1 − afstand / K))`
  - K hangt af van de statistiek: `K = log10(beste / mediaan) / (1 − 0,3)`. Een land op de mediaan krijgt zo altijd 300 punten, of de waarden nu dicht bij elkaar liggen (levensverwachting) of over ordes van grootte verspreid zijn (bbp). K wordt bij het spelen uit de data berekend (`src/core/scoring.ts`).
  - Een waarde van 0 (bijvoorbeeld 0% bos) geeft 0 punten.
  - `straf = min(300, 10 × max(0, seconden − 5))`
  - `score = max(0, basis − straf)`
  - Geen data voor het gekozen land, of de limiet van 60 seconden verlopen: 0 punten.
- Maximale dagscore: 7000.
- Na elke ronde ziet de speler de waarde van het gekozen land, de positie in de ranglijst en de top 5.
- Opslag in `localStorage`: voortgang van vandaag, een streak en statistieken. Je kunt maar één keer per dag spelen.
- Deelknop met een emoji-raster: 🟩 ≥ 800, 🟨 ≥ 400, 🟧 > 0, ⬛ 0.
- De interface is in het Nederlands. Het spel is statisch, met Vite + TypeScript en zonder backend.

## Fase 0 — Projectopzet

- Vite met de vanilla TypeScript-template, Vitest, ESLint en Prettier, en `strict` in tsconfig.
- Mappen:
  - `src/core/`: pure logica, zonder DOM
  - `src/ui/`
  - `src/data/`: gegenereerde JSON
  - `scripts/`: data-pipeline
- **Klaar wanneer:** `npm run dev`, `npm test` en `npm run build` werken.

## Fase 1 — Data

- `countries.json`: per land de ISO3-code, de Nederlandse en Engelse naam, aliassen (VS, USA, VK, …) en een vlag-emoji.
- `stats.json`: per statistiek een id, de vraagtekst in het Nederlands, de eenheid, het peiljaar, de bron, een opmaakfunctie-id en `values: { ISO3: number }`.
- `scripts/fetch-data.ts` haalt 15–25 indicatoren op via de World Bank-API. Het script draait lokaal, en we committen de JSON die eruit komt. De app haalt bij het spelen niets op.
- `scripts/validate-data.ts` controleert dat:
  - alle waarden groter dan 0 zijn;
  - elke statistiek data heeft voor minstens 150 landen;
  - er geen gelijke stand is op de eerste plaats;
  - alle ISO-codes bestaan.
- Bronvermelding volgens CC BY 4.0 (World Bank) in de UI.
- **Klaar wanneer:** de validatie zonder fouten slaagt.

## Fase 2 — Kernlogica (puur, met tests)

- `rng.ts`: hash van de datum naar mulberry32.
- `puzzle.ts`: `getPuzzle(datum) → 7 stat-ids`. Altijd dezelfde uitkomst voor dezelfde datum.
- `scoring.ts`: basisscore, tijdstraf en randgevallen (de beste keuze geeft 1000, ontbrekende data geeft 0, de limiet geeft 0).
- `match.ts`: normaliseren (kleine letters, accenten en leestekens weg), dan rangschikken: exacte alias, dan prefix, dan substring, dan Damerau-Levenshtein met maximaal 1–2 fouten, afhankelijk van de lengte.
- `ranking.ts`: rang van een land plus de top 5.
- **Klaar wanneer:** er Vitest-tests zijn voor alle bovenstaande modules, inclusief goede tabellen voor matching ("nederland", "holland", "VS", "Brazilie", "brasil", "zuid korea").

## Fase 3 — Spel-UI

- Een kleine state machine: `intro → ronde → onthulling → … → einde`.
- Rondescherm: de vraag, een aftellende timer van 60 seconden, een invoerveld met autocomplete (bediening met pijltjes en Enter, maximaal 6 suggesties) en een knop om te bevestigen.
- Onthulling: de waarde van het gekozen land, de rang, een scorebalk, de top 5 en de verdeling van de tijdstraf.
- Eindscherm: totaalscore, een overzicht per ronde en de deelknop.
- **Klaar wanneer:** je een volledige puzzel kunt spelen in de dev-server.

## Fase 4 — Opslag en delen

- De `localStorage`-state heeft een versienummer: `{ datum, rondes[], rondeStartTijd }`.
- Herladen tijdens een ronde zet de timer niet terug, omdat de starttijd is opgeslagen.
- Een afgeronde puzzel van vandaag toont direct het eindscherm.
- Statistieken: aantal keer gespeeld, gemiddelde score, beste score, huidige en langste streak.
- Delen via `navigator.share`, of als dat niet kan via kopiëren naar het klembord. De tekst bevat het puzzelnummer, de score en het emoji-raster.
- Elke toegang tot `localStorage` zit in een try/catch, zodat het spel ook werkt zonder opslag.
- **Klaar wanneer:** herladen, de volgende dag en de streak getest zijn, met een nepdatum via `?date=` (alleen in dev).

## Fase 5 — Afwerking en deploy

- Responsief tot 360 px breed, toegankelijk (labels, `aria-live` voor de timer en de onthulling) en een donkere modus.
- Een uitlegscherm voor nieuwe spelers.
- Een GitHub Actions-workflow die test, bouwt en naar GitHub Pages publiceert.
- **Klaar wanneer:** de live URL werkt en Lighthouse voor toegankelijkheid minstens 95 scoort.

## Status (13 november 2026)

Fase 0 t/m 5 zijn gebouwd en lokaal gecontroleerd (138 tests, lint, build, handmatig in de browser
op desktop en 360 px, licht en donker). Nog niet gedaan:

- De repository naar GitHub pushen en Pages inschakelen; de live URL bestaat dus nog niet.
- Lighthouse draaien op de live URL.
- De statistiek "vrouwen in het parlement" ophalen (`npm run data:fetch`); die mislukte eenmalig door een 502.
