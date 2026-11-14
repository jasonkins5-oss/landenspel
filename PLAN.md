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

## Versie 2 — "Graaf naar de kern" (plan, 13 november 2026)

Nieuwe richting, geïnspireerd op de sfeer van Krillion (pixel-art, retro-font, één antwoord
per vraag, hoe beter je antwoord hoe dieper je zakt). Eigen tekeningen en eigen code; niets
wordt gekopieerd. De spelregels van versie 1 (log-score, tijdstraf) blijven de basis.

Beslissingen:

- Geen server. Score en statistieken blijven lokaal; delen via de deelknop. Een publieke
  ranglijst kan later met Supabase.
- Drie categorieën om mee te starten: **Landen** (World Bank, zoals nu), **Dieren** en
  **Sport**. Dieren en sport komen uit handgemaakte JSON-bestanden met bronvermelding per
  vraag, ongeveer 20 vragen per categorie.
- Makkelijker: alleen bekende statistieken (inwoners, oppervlakte, bbp, …); de obscure
  World Bank-indicatoren verdwijnen uit de dagelijkse puzzel.
- Twee spelmodi: **Dagelijks** (één puzzel per dag per categorie) en **Onbeperkt**
  (willekeurige puzzels, `?game=N` om een puzzel te delen of opnieuw te spelen).

### Fase 6 — Generieke categorieën

- `Stat` krijgt een `category` en een antwoordtype: `country` (autocomplete op landen) of
  `item` (autocomplete op een lijst van dieren/sporters/teams per vraag).
- `src/data/categories/{landen,dieren,sport}.json`; de matcher werkt op elke lijst van
  namen met aliassen.
- Categoriekeuze op het startscherm; voortgang en statistieken per categorie in localStorage.
- **Klaar wanneer:** de bestaande tests nog slagen en elke categorie speelbaar is in de dev-server.
- **Status:** klaar (13 november 2026). Landen 14 statistieken, Dieren 74 dieren / 10 vragen,
  Sport 10 vragen op de landenlijst. Opslagversie 2, `?cat=` in de URL.

### Fase 7 — Onbeperkt spelen

- `getPuzzle(seed)` werkt al deterministisch; onbeperkt = seed uit `?game=N`, "Volgende
  puzzel" verhoogt N. Dagelijks blijft de datum-seed.
- Onbeperkte scores tellen niet mee in de streak, wel in een aparte "beste onbeperkt".
- **Klaar wanneer:** je eindeloos kunt doorspelen en een puzzel via URL kunt delen.
- **Status:** klaar (14 november 2026). Schakelaar Dagelijks/Onbeperkt op het keuzescherm; de
  onbeperkte reeks begint per categorie bij #1 en gaat na een afgeronde puzzel door naar de
  volgende. `?cat=dieren&game=3` opent een puzzel direct; de deeltekst bevat die link.
  Onbeperkte scores staan apart (gespeeld, gemiddeld, beste) en raken de streak niet.

### Fase 8 — Nieuwe look: de doorsnede van de aarde

- Pixel-art stijl: retro-font (Google Fonts, bijv. "Press Start 2P" voor koppen en "VT323"
  voor tekst), scanline-sfeer, donkere panelen met lichte rand.
- Achtergrond: een verticale doorsnede van de aarde als laag-voor-laag getekend canvas
  (gras/korst → aardmantel → buitenkern → binnenkern), met een dieptemeter rechts en
  weetjes per laag ("hier is het 1000 °C", "diepste boorgat ooit: 12 km", …).
- Score → diepte: 1000 punten = de kern. Na elk antwoord graaft een pixel-graafmachine
  geanimeerd naar de nieuwe diepte (CSS/canvas, respecteert `prefers-reduced-motion`).
- Tiers per ronde, in plaats van alleen een getal: bijv. **Oppervlakte** (0), **Korst**
  (< 300), **Mantel** (< 600), **Buitenkern** (< 900), **Binnenkern** (≥ 900), met een
  korte spreuk per tier.
- Boven: diepte, voortgangsblokjes (7), score. Onder: timer-cirkel, invoerveld, knop
  "GRAAF". Daarna een "DIEPER ▼"-knop.
- Optioneel geluid (uit standaard, aan/uit-knop).
- **Klaar wanneer:** de hele flow draait in de nieuwe stijl op desktop en 360 px, en
  het spel nog steeds toegankelijk is (toetsenbord, schermlezer, reduced motion).
- **Status:** klaar (14 november 2026). Diepte-model in `src/core/depth.ts` (7000 punten =
  6.371 km, zes lagen met ankerpunten, 13 weetjes, 6 tiers: Mis gegraven, Zandkorrel, Kiezel,
  Rotsblok, Magma, Kern). Scène in `src/ui/scene.ts` met canvas-pixeltexturen, HUD in
  `src/ui/hud.ts`, geluid in `src/ui/sound.ts` (standaard uit). Lettertypes Press Start 2P en
  VT323 lokaal via `@fontsource` (geen verzoeken naar Google). Eén vast donker paneelthema.
  Tijdens het testen gevonden en opgelost: klikken op GRAAF sloot eerst de suggestielijst, waardoor
  een gemarkeerde suggestie verloren ging. Nog niet gedaan: Lighthouse-meting op de live URL.

### Fase 9 — Afwerking

- Archief van eerdere dagpuzzels (`?date=` wordt een echte functie).
- Deeltekst per categorie en modus.
- Lighthouse ≥ 95 toegankelijkheid; deploy via de bestaande workflow.

## Status (13 november 2026)

Fase 0 t/m 5 zijn gebouwd en lokaal gecontroleerd (138 tests, lint, build, handmatig in de browser
op desktop en 360 px, licht en donker). De repository staat op GitHub
(`jasonkins5-oss/landenspel`) en het spel is live via GitHub Actions op
https://jasonkins5-oss.github.io/landenspel/. Nog niet gedaan:

- Lighthouse draaien op de live URL.
- De statistiek "vrouwen in het parlement" ophalen (`npm run data:fetch`); die mislukte eenmalig door een 502.
