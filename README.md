# CORE DIVE

Een Engels woordspel in pixelstijl: elke ronde een open vraag als *"Name a dog breed"*. Typ één
antwoord; **hoe zeldzamer het antwoord, hoe meer punten** en hoe dieper je graaft. Een perfecte
dive (7 × 1000) eindigt in het middelpunt van de aarde. Modi: Daily, Unlimited en Archive.

Zeldzaamheid = wat andere spelers antwoorden (Supabase), gecombineerd met hoe bekend een antwoord
is (aantal Wikipedia-edities). Zonder server werkt het spel met alleen die schatting.

De spelregels en de fasering staan in [PLAN.md](PLAN.md). Lettertypes: Press Start 2P en VT323
(SIL Open Font License), lokaal meegeleverd via `@fontsource`.

## Ontwikkelen

Vereist Node 20 of hoger.

```bash
npm install
npm run dev          # dev-server op http://localhost:5173
npm test             # Vitest
npm run lint
npm run build        # tsc --noEmit + vite build → dist/
```

Handig bij testen: `?date=2026-11-20` forceert een andere dag, `?dive=3` opent dive #3 en
`?archive=2026-11-13` een oude dagpuzzel. De opslag staat in `localStorage` onder `coredive:*`.

## Data

Alle antwoorden komen uit [Wikidata](https://www.wikidata.org/) (CC0). Per vraag staat een
SPARQL-patroon in `scripts/prompts.ts`; het script haalt de items op met hun Engelse naam,
Engelse aliassen en het aantal Wikipedia-edities.

```bash
npm run data:fetch                    # alle vragen (ruwe antwoorden gecachet in .cache/wikidata/)
npm run data:fetch -- --only=cheese   # een paar vragen
npm run data:fetch -- --refresh       # negeert de cache
npm run data:validate                 # controles + punten per positie in de lijst
```

Uitvoer: `src/data/prompts.json` (de index, zit in de app) en `public/prompts/<id>.json` (de
antwoorden van één vraag, pas geladen als een puzzel hem nodig heeft).

Een vraag toevoegen: een regel in `scripts/prompts.ts`, dan `npm run data:fetch -- --only=<id>`
en `npm run data:validate`. Vragen met minder dan 25 antwoorden worden overgeslagen.

## Server (Supabase)

1. Maak een gratis project op [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: plak `supabase/schema.sql` en klik *Run*.
3. **Project Settings → API**: kopieer de *Project URL* en de publieke sleutel (*anon* of
   *publishable*). Nooit de *service_role*/*secret* sleutel gebruiken.
4. Lokaal: maak `.env.local` met
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publieke sleutel>
   ```
5. Voor de live site: GitHub → **Settings → Secrets and variables → Actions → Variables** →
   dezelfde twee namen en waarden. De workflow geeft ze door aan de build.

## Deploy

`.github/workflows/deploy.yml` draait lint, datavalidatie, tests en build bij elke push en
publiceert `dist/` naar GitHub Pages bij een push naar `main`. De build gebruikt relatieve paden
(`base: './'`), dus hij werkt onder `https://<gebruiker>.github.io/<repo>/`.
