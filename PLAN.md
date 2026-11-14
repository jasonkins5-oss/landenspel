# CORE DIVE — plan (versie 3)

Versie 1 ("Landenspel": landenstatistieken) en versie 2 (categorieën en de pixel-look) staan in de
git-geschiedenis. Versie 3 laat de statistiekvragen en de categorieën los en wordt een Engels
spel in de geest van Krillion, met eigen naam, eigen tekeningen en eigen code. Het design van
versie 2 blijft: de doorsnede van de aarde, de graafmachine, de HUD en de tiers.

## Spelregels

- Elke ronde is een open vraag: **"Name a dog breed"**, "Name a cheese", "Name a moon of Jupiter".
- De speler typt **één antwoord** in vrije tekst, zonder suggesties (anders verraden die de
  niche antwoorden). Matching is tolerant: hoofdletters, accenten, aliassen, meervoud en kleine
  tikfouten.
- Een antwoord dat we niet kennen kost **geen beurt**: "We don't know that one, try another". De
  speler mag opnieuw tot de tijd op is. Zo wordt een geldig maar onbekend antwoord nooit
  afgestraft als fout.
- **30 seconden** per vraag, geen tijdstraf. Tijd op = 0 punten.
- **Hoe zeldzamer het antwoord, hoe meer punten** (100 tot 1000) en hoe dieper je graaft. Een
  perfecte puzzel (7 × 1000) eindigt in het middelpunt van de aarde.
- Modi: **Daily** (7 vragen, voor iedereen dezelfde, telt voor de streak), **Unlimited**
  (genummerde dives #1, #2, …, eindeloos) en **Archive** (oude dagpuzzels).
- Alles in het Engels: interface, vragen en antwoorden.

## Zeldzaamheid

Krillion telt wat spelers antwoorden. Wij ook, met een startwaarde zodat het vanaf dag één werkt:

- **Startwaarde (prior):** per antwoord het aantal Wikipedia-taaledities dat een artikel heeft
  (Wikidata "sitelinks"). Labrador Retriever heeft er veel, Pumi weinig. De prior is een
  verdeling over de antwoorden, samen goed voor `P` nep-antwoorden.
- **Telling:** elk ingediend antwoord wordt op de server geteld (per vraag, per antwoord).
- **Aandeel** van antwoord `i`: `(telling_i + prior_i) / (totaal + P)`. Met weinig spelers
  bepaalt de prior het beeld; met veel spelers de echte tellingen.
- **Punten:** `C` = het totale aandeel van alle antwoorden die vaker gegeven worden dan het jouwe
  ("rarer than 97% of answers"). `punten = round(100 + 900 × C^1,5)`. Het populairste antwoord
  geeft 100, een antwoord dat bijna niemand geeft bijna 1000.
- Jouw eigen antwoord telt pas mee ná het berekenen van je score.
- De score wordt bij het indienen vastgelegd en opgeslagen (de server verandert later, de score
  niet). Zonder server (offline, of nog niet ingesteld) rekent het spel met alleen de prior.

## Fase 10 — Data

- `scripts/prompts.ts`: vraagdefinities (id, Engelse vraag, Wikidata-query of handgemaakte lijst).
  Doel: **150+ vragen** van algemene kennis (dieren, eten, aardrijkskunde, ruimte, muziek, sport,
  wetenschap, mythologie, …).
- `scripts/fetch-prompts.ts`: haalt per vraag de antwoorden op (Engels label, Engelse aliassen,
  sitelinks), gecachet; schoont op (haakjes weg, dubbelingen, te generieke namen).
- Per vraag een JSON-bestand in `public/prompts/`, plus een index; de app laadt alleen de vragen
  die hij nodig heeft.
- Validatie: minimaal 25 antwoorden per vraag, geen dubbele sleutels; een rapport met de top 5
  en een paar obscure voorbeelden per vraag om de kwaliteit te beoordelen.
- **Klaar wanneer:** 150+ vragen door de validatie komen en de steekproef er goed uitziet.

## Fase 11 — Kern

- Zeldzaamheid en punten (zie boven), tiers in het Engels.
- Vrij-tekst-matching op naam en aliassen, met meervoud en tikfouten; "onbekend" geeft null.
- Puzzels: 7 vragen per dag of per dive-nummer uit de hele pool (seed zoals nu).
- Opslag versie 3: één set statistieken (geen categorieën), voortgang per modus, archief.
- **Klaar wanneer:** alles getest is met Vitest.

## Fase 12 — Interface in het Engels

- Alle teksten Engels, naam CORE DIVE. Geen categoriekeuze en geen suggestielijst meer.
- Onthulling: tier, "rarer than X% of answers", de meest gegeven antwoorden en een paar
  "deep cuts" die je had kunnen geven.
- **Klaar wanneer:** de hele flow werkt op desktop en 360 px, toegankelijk.

## Fase 13 — Server (Supabase)

- Tabel met tellingen per (vraag, antwoord); een databasefunctie die een antwoord telt en de
  tellingen van die vraag teruggeeft. Leesrechten voor iedereen, schrijven alleen via die functie.
- In de app: `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` (de publieke sleutel; de geheime
  service-sleutel komt nooit in de app). Zonder die variabelen of bij een fout: alleen de prior.
- Bekende beperking: zonder inlog kan iemand de tellingen vervuilen door veel te spammen. Voor
  een hobbyspel acceptabel; later eventueel een limiet per apparaat.
- **Klaar wanneer:** twee browsers elkaars antwoorden zien meetellen.

## Status (14 november 2026)

Versie 2 staat live op https://jasonkins5-oss.github.io/landenspel/. Versie 3 is gestart.

Versie 3 is lokaal gebouwd en getest (nog niet live):

- 186 vragen met samen ~103.000 antwoorden uit Wikidata. Labels: Engels, anders "mul" (zonder
  die terugval ontbraken o.a. Toy Story en Up). Vogels en kevers staan nog met hun eerdere lijst
  (Wikidata gaf bij opnieuw ophalen een time-out).
- Punten: gemiddelde van de verrassingswaarde (log-aandeel tussen populairste antwoord en de
  bodem) en de plek in de rangorde. Een eerste versie met alleen "aandeel dat gewoner is" gaf
  alles buiten de top tien bijna 1000 punten.
- Supabase-project ingericht en getest: lezen werkt, tellen alleen via `record_answer`, direct
  schrijven en onzin-invoer worden geweigerd. Tijdens het testen zijn een handvol antwoorden
  echt geteld (plus één `selftest`-rij); met een prior van 60 nep-antwoorden maakt dat niets uit.
- Nog te doen voor live: de twee Supabase-waarden als GitHub Actions-variabelen zetten, pushen.
