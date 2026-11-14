/**
 * Vraagdefinities voor CORE DIVE. Elke vraag haalt zijn antwoorden uit Wikidata: alle items die
 * aan een SPARQL-patroon voldoen, met hun Engelse naam, Engelse aliassen en het aantal
 * Wikipedia-taaledities ("sitelinks") als maat voor bekendheid.
 *
 * Het patroon gebruikt altijd de variabele ?item. `minSitelinks` houdt ruis en reuzenlijsten weg;
 * bij kleine onderwerpen staat hij op 1, zodat ook heel niche (maar echte) antwoorden meetellen.
 *
 * Let op: de id van een vraag is ook de sleutel van de spelerstellingen op de server. Hernoem een
 * bestaande vraag dus niet zonder reden.
 */

export interface PromptDef {
  id: string;
  /** De vraag zoals de speler hem ziet. */
  prompt: string;
  /** SPARQL-patroon dat ?item bindt. */
  where: string;
  /** Minimaal aantal Wikipedia-edities; standaard 1 (er bestaat minstens één artikel). */
  minSitelinks?: number;
  /** Mensen: voeg de achternaam toe als alias ("Monet"). */
  people?: boolean;
  /** Taxa: voeg de wetenschappelijke naam (P225) toe als alias. */
  taxon?: boolean;
  /**
   * Tweede patroon: items die hieraan voldoen vallen af. Een losse query is voor Wikidata
   * vaak veel lichter dan een FILTER NOT EXISTS in de hoofdquery.
   */
  exclude?: string;
}

const instance = (q: string) => `?item wdt:P31 wd:${q} .`;
const instanceOrSub = (q: string) => `?item wdt:P31/wdt:P279* wd:${q} .`;
const kind = (q: string) =>
  `{ ?item wdt:P31/wdt:P279* wd:${q} . } UNION { ?item wdt:P279+ wd:${q} . }`;
const person = (occupation: string) => `?item wdt:P31 wd:Q5 ; wdt:P106 wd:${occupation} .`;
const held = (position: string) => `?item wdt:P31 wd:Q5 ; wdt:P39 wd:${position} .`;
/**
 * Alle taxa onder een clade: soorten, maar ook geslachten, families en ordes. Zo wordt "owl"
 * (de orde) ook herkend bij "Name a bird"; zulke groepsnamen zijn bekend en scoren dus laag.
 */
const taxa = (clade: string) => `?item wdt:P171+ wd:${clade} .`;
const inCountry = (q: string, country: string) =>
  `?item wdt:P31/wdt:P279* wd:${q} ; wdt:P17 wd:${country} .`;
const city = (country: string) => inCountry('Q515', country);
const dishFrom = (country: string) =>
  `?item wdt:P31/wdt:P279* wd:Q746549 ; wdt:P495 wd:${country} .`;
const moonOf = (planet: string) => `?item wdt:P31/wdt:P279* wd:Q2537 ; wdt:P397 wd:${planet} .`;
/** Werk van iemand: `prop` is de relatie (P50 auteur, P170 maker, P86 componist, P57 regisseur, P175 artiest). */
const workBy = (type: string, prop: string, who: string) =>
  `?item wdt:${prop} wd:${who} ; wdt:P31/wdt:P279* wd:${type} .`;
const PAINTING = 'Q3305213';
const FILM = 'Q11424';
const LITERARY_WORK = 'Q7725634';
const MUSICAL_WORK = 'Q2188189';

export const PROMPTS: PromptDef[] = [
  // ── Dieren ──
  { id: 'dog-breed', prompt: 'Name a dog breed', where: instance('Q39367') },
  { id: 'cat-breed', prompt: 'Name a cat breed', where: instance('Q43577') },
  { id: 'horse-breed', prompt: 'Name a horse breed', where: instance('Q1160573') },
  { id: 'chicken-breed', prompt: 'Name a chicken breed', where: instance('Q15304943') },
  { id: 'cattle-breed', prompt: 'Name a cattle breed', where: instance('Q12045585') },
  { id: 'sheep-breed', prompt: 'Name a sheep breed', where: instance('Q15622363') },
  { id: 'pig-breed', prompt: 'Name a pig breed', where: instance('Q18786396') },
  { id: 'rabbit-breed', prompt: 'Name a rabbit breed', where: instance('Q12045584') },
  { id: 'goat-breed', prompt: 'Name a goat breed', where: instance('Q15622387') },
  { id: 'mammal', prompt: 'Name a mammal', where: taxa('Q7377'), minSitelinks: 12, taxon: true },
  { id: 'bird', prompt: 'Name a bird', where: taxa('Q5113'), minSitelinks: 15, taxon: true },
  {
    id: 'reptile',
    prompt: 'Name a reptile',
    where:
      '{ ?item wdt:P171+ wd:Q122422 . } UNION { ?item wdt:P171+ wd:Q223044 . } UNION { ?item wdt:P171+ wd:Q25363 . }',
    minSitelinks: 8,
    taxon: true,
  },
  {
    id: 'amphibian',
    prompt: 'Name an amphibian',
    where: taxa('Q10908'),
    minSitelinks: 6,
    taxon: true,
  },
  { id: 'fish', prompt: 'Name a fish', where: taxa('Q127282'), minSitelinks: 12, taxon: true },
  { id: 'shark', prompt: 'Name a shark', where: taxa('Q7372'), minSitelinks: 3, taxon: true },
  {
    id: 'whale-dolphin',
    prompt: 'Name a whale or dolphin',
    where: taxa('Q160'),
    minSitelinks: 3,
    taxon: true,
  },
  {
    id: 'dinosaur',
    prompt: 'Name a dinosaur',
    where: '?item wdt:P171+ wd:Q430 ; wdt:P105 wd:Q34740 .',
    exclude: '?item wdt:P171+ wd:Q5113 ; wdt:P105 wd:Q34740 .',
    minSitelinks: 3,
    taxon: true,
  },
  { id: 'primate', prompt: 'Name a primate', where: taxa('Q7380'), minSitelinks: 6, taxon: true },
  { id: 'snake', prompt: 'Name a snake', where: taxa('Q25537662'), minSitelinks: 5, taxon: true },
  { id: 'spider', prompt: 'Name a spider', where: taxa('Q1357'), minSitelinks: 4, taxon: true },
  {
    id: 'butterfly-moth',
    prompt: 'Name a butterfly or moth',
    where: taxa('Q28319'),
    minSitelinks: 10,
    taxon: true,
  },
  {
    id: 'turtle',
    prompt: 'Name a turtle or tortoise',
    where: taxa('Q223044'),
    minSitelinks: 3,
    taxon: true,
  },
  {
    id: 'wild-cat',
    prompt: 'Name a wild cat',
    where: taxa('Q25265'),
    minSitelinks: 2,
    taxon: true,
  },
  { id: 'rodent', prompt: 'Name a rodent', where: taxa('Q10850'), minSitelinks: 8, taxon: true },
  { id: 'beetle', prompt: 'Name a beetle', where: taxa('Q22671'), minSitelinks: 8, taxon: true },
  {
    id: 'cephalopod',
    prompt: 'Name an octopus, squid or other cephalopod',
    where: taxa('Q128257'),
    minSitelinks: 3,
    taxon: true,
  },
  { id: 'pokemon', prompt: 'Name a Pokémon', where: kind('Q3966183') },

  // ── Eten en drinken ──
  { id: 'cheese', prompt: 'Name a cheese', where: kind('Q10943') },
  { id: 'pasta', prompt: 'Name a pasta shape', where: kind('Q178') },
  { id: 'cocktail', prompt: 'Name a cocktail', where: kind('Q134768') },
  { id: 'bread', prompt: 'Name a type of bread', where: kind('Q7802'), minSitelinks: 2 },
  { id: 'vegetable', prompt: 'Name a vegetable', where: kind('Q11004'), minSitelinks: 3 },
  { id: 'fruit', prompt: 'Name a fruit', where: kind('Q3314483'), minSitelinks: 3 },
  { id: 'spice', prompt: 'Name a spice', where: kind('Q42527'), minSitelinks: 3 },
  { id: 'sauce', prompt: 'Name a sauce', where: kind('Q178359') },
  { id: 'dessert', prompt: 'Name a dessert', where: kind('Q182940'), minSitelinks: 2 },
  { id: 'soup', prompt: 'Name a soup', where: kind('Q41415') },
  { id: 'sausage', prompt: 'Name a sausage', where: kind('Q131419') },
  { id: 'cake', prompt: 'Name a cake', where: kind('Q13276'), minSitelinks: 2 },
  { id: 'cookie', prompt: 'Name a cookie or biscuit', where: kind('Q13266') },
  { id: 'pastry', prompt: 'Name a pastry', where: kind('Q477248'), minSitelinks: 2 },
  { id: 'candy', prompt: 'Name a sweet or candy', where: kind('Q185583'), minSitelinks: 2 },
  { id: 'salad', prompt: 'Name a salad', where: kind('Q9266') },
  { id: 'noodle-dish', prompt: 'Name a noodle dish', where: kind('Q98826752') },
  { id: 'rice-dish', prompt: 'Name a rice dish', where: kind('Q21976260') },
  { id: 'dumpling', prompt: 'Name a dumpling', where: kind('Q1854639') },
  { id: 'sandwich', prompt: 'Name a sandwich', where: kind('Q28803') },
  { id: 'beer-style', prompt: 'Name a style of beer', where: kind('Q1998962') },
  { id: 'grape-variety', prompt: 'Name a grape variety', where: kind('Q958314'), minSitelinks: 3 },
  { id: 'coffee-drink', prompt: 'Name a coffee drink', where: kind('Q8486') },
  { id: 'tea', prompt: 'Name a type of tea', where: kind('Q6097') },
  { id: 'spirit', prompt: 'Name a spirit or liquor', where: kind('Q56139'), minSitelinks: 3 },
  { id: 'apple-variety', prompt: 'Name an apple variety', where: kind('Q15731356') },
  { id: 'italian-dish', prompt: 'Name an Italian dish', where: dishFrom('Q38') },
  { id: 'french-dish', prompt: 'Name a French dish', where: dishFrom('Q142') },
  { id: 'japanese-dish', prompt: 'Name a Japanese dish', where: dishFrom('Q17') },
  { id: 'chinese-dish', prompt: 'Name a Chinese dish', where: dishFrom('Q148') },
  { id: 'indian-dish', prompt: 'Name an Indian dish', where: dishFrom('Q668') },
  { id: 'mexican-dish', prompt: 'Name a Mexican dish', where: dishFrom('Q96') },
  { id: 'spanish-dish', prompt: 'Name a Spanish dish', where: dishFrom('Q29') },
  { id: 'thai-dish', prompt: 'Name a Thai dish', where: dishFrom('Q869') },
  { id: 'korean-dish', prompt: 'Name a Korean dish', where: dishFrom('Q884') },
  { id: 'greek-dish', prompt: 'Name a Greek dish', where: dishFrom('Q41') },
  { id: 'turkish-dish', prompt: 'Name a Turkish dish', where: dishFrom('Q43') },
  { id: 'british-dish', prompt: 'Name a British dish', where: dishFrom('Q145') },
  { id: 'vietnamese-dish', prompt: 'Name a Vietnamese dish', where: dishFrom('Q881') },
  { id: 'german-dish', prompt: 'Name a German dish', where: dishFrom('Q183') },
  { id: 'brazilian-dish', prompt: 'Name a Brazilian dish', where: dishFrom('Q155') },
  { id: 'peruvian-dish', prompt: 'Name a Peruvian dish', where: dishFrom('Q419') },
  { id: 'lebanese-dish', prompt: 'Name a Lebanese dish', where: dishFrom('Q822') },
  { id: 'moroccan-dish', prompt: 'Name a Moroccan dish', where: dishFrom('Q1028') },
  { id: 'indonesian-dish', prompt: 'Name an Indonesian dish', where: dishFrom('Q252') },
  { id: 'filipino-dish', prompt: 'Name a Filipino dish', where: dishFrom('Q928') },
  { id: 'russian-dish', prompt: 'Name a Russian dish', where: dishFrom('Q159') },
  { id: 'polish-dish', prompt: 'Name a Polish dish', where: dishFrom('Q36') },
  { id: 'dutch-dish', prompt: 'Name a Dutch dish', where: dishFrom('Q55') },
  { id: 'american-dish', prompt: 'Name an American dish', where: dishFrom('Q30') },

  // ── Aardrijkskunde ──
  { id: 'country', prompt: 'Name a country', where: instance('Q3624078') },
  {
    id: 'capital',
    prompt: 'Name a capital city',
    where: '?country wdt:P31 wd:Q3624078 ; wdt:P36 ?item .',
  },
  { id: 'us-state', prompt: 'Name a US state', where: instance('Q35657') },
  { id: 'island', prompt: 'Name an island', where: instanceOrSub('Q23442'), minSitelinks: 25 },
  { id: 'river', prompt: 'Name a river', where: instanceOrSub('Q4022'), minSitelinks: 30 },
  { id: 'mountain', prompt: 'Name a mountain', where: instanceOrSub('Q8502'), minSitelinks: 25 },
  { id: 'lake', prompt: 'Name a lake', where: instanceOrSub('Q23397'), minSitelinks: 25 },
  { id: 'desert', prompt: 'Name a desert', where: instanceOrSub('Q8514'), minSitelinks: 5 },
  { id: 'volcano', prompt: 'Name a volcano', where: instanceOrSub('Q8072'), minSitelinks: 8 },
  { id: 'sea', prompt: 'Name a sea', where: instanceOrSub('Q165'), minSitelinks: 8 },
  { id: 'language', prompt: 'Name a language', where: instanceOrSub('Q34770'), minSitelinks: 25 },
  { id: 'currency', prompt: 'Name a currency', where: instanceOrSub('Q8142'), minSitelinks: 10 },
  { id: 'city-germany', prompt: 'Name a city in Germany', where: city('Q183'), minSitelinks: 20 },
  { id: 'city-france', prompt: 'Name a city in France', where: city('Q142'), minSitelinks: 20 },
  { id: 'city-italy', prompt: 'Name a city in Italy', where: city('Q38'), minSitelinks: 20 },
  { id: 'city-spain', prompt: 'Name a city in Spain', where: city('Q29'), minSitelinks: 15 },
  {
    id: 'city-uk',
    prompt: 'Name a city in the United Kingdom',
    where: city('Q145'),
    minSitelinks: 20,
  },
  {
    id: 'city-usa',
    prompt: 'Name a city in the United States',
    where: city('Q30'),
    minSitelinks: 40,
  },
  { id: 'city-japan', prompt: 'Name a city in Japan', where: city('Q17'), minSitelinks: 20 },
  { id: 'city-china', prompt: 'Name a city in China', where: city('Q148'), minSitelinks: 25 },
  { id: 'city-india', prompt: 'Name a city in India', where: city('Q668'), minSitelinks: 25 },
  { id: 'city-brazil', prompt: 'Name a city in Brazil', where: city('Q155'), minSitelinks: 20 },
  { id: 'city-canada', prompt: 'Name a city in Canada', where: city('Q16'), minSitelinks: 15 },
  {
    id: 'city-australia',
    prompt: 'Name a city in Australia',
    where: city('Q408'),
    minSitelinks: 10,
  },
  {
    id: 'city-netherlands',
    prompt: 'Name a city in the Netherlands',
    where: city('Q55'),
    minSitelinks: 15,
  },
  { id: 'city-mexico', prompt: 'Name a city in Mexico', where: city('Q96'), minSitelinks: 15 },
  { id: 'city-russia', prompt: 'Name a city in Russia', where: city('Q159'), minSitelinks: 25 },
  { id: 'city-turkey', prompt: 'Name a city in Turkey', where: city('Q43'), minSitelinks: 20 },
  { id: 'city-poland', prompt: 'Name a city in Poland', where: city('Q36'), minSitelinks: 20 },
  {
    id: 'city-argentina',
    prompt: 'Name a city in Argentina',
    where: city('Q414'),
    minSitelinks: 12,
  },
  {
    id: 'city-south-africa',
    prompt: 'Name a city in South Africa',
    where: city('Q258'),
    minSitelinks: 10,
  },
  { id: 'city-sweden', prompt: 'Name a city in Sweden', where: city('Q34'), minSitelinks: 15 },
  { id: 'city-belgium', prompt: 'Name a city in Belgium', where: city('Q31'), minSitelinks: 15 },
  {
    id: 'city-switzerland',
    prompt: 'Name a city in Switzerland',
    where: city('Q39'),
    minSitelinks: 15,
  },
  { id: 'city-portugal', prompt: 'Name a city in Portugal', where: city('Q45'), minSitelinks: 12 },
  { id: 'city-greece', prompt: 'Name a city in Greece', where: city('Q41'), minSitelinks: 12 },
  {
    id: 'city-south-korea',
    prompt: 'Name a city in South Korea',
    where: city('Q884'),
    minSitelinks: 12,
  },
  { id: 'city-norway', prompt: 'Name a city in Norway', where: city('Q20'), minSitelinks: 12 },
  { id: 'city-austria', prompt: 'Name a city in Austria', where: city('Q40'), minSitelinks: 12 },
  {
    id: 'city-indonesia',
    prompt: 'Name a city in Indonesia',
    where: city('Q252'),
    minSitelinks: 12,
  },
  {
    id: 'national-park',
    prompt: 'Name a national park',
    where: instanceOrSub('Q46169'),
    minSitelinks: 15,
  },
  {
    id: 'castle-uk',
    prompt: 'Name a castle in Britain',
    where: inCountry('Q23413', 'Q145'),
    minSitelinks: 4,
  },
  {
    id: 'bridge',
    prompt: 'Name a famous bridge',
    where: instanceOrSub('Q12280'),
    minSitelinks: 15,
  },
  {
    id: 'skyscraper',
    prompt: 'Name a skyscraper',
    where: instanceOrSub('Q11303'),
    minSitelinks: 12,
  },
  { id: 'airline', prompt: 'Name an airline', where: instanceOrSub('Q46970'), minSitelinks: 12 },

  // ── Ruimte ──
  { id: 'moon-jupiter', prompt: 'Name a moon of Jupiter', where: moonOf('Q319') },
  { id: 'moon-saturn', prompt: 'Name a moon of Saturn', where: moonOf('Q193') },
  { id: 'moon-uranus', prompt: 'Name a moon of Uranus', where: moonOf('Q324') },
  { id: 'constellation', prompt: 'Name a constellation', where: instance('Q8928') },
  { id: 'comet', prompt: 'Name a comet', where: instanceOrSub('Q3559'), minSitelinks: 3 },
  {
    id: 'space-probe',
    prompt: 'Name a space probe',
    where: instanceOrSub('Q26529'),
    minSitelinks: 5,
  },
  {
    id: 'astronaut',
    prompt: 'Name an astronaut',
    where: person('Q11631'),
    minSitelinks: 15,
    people: true,
  },

  // ── Wetenschap en techniek ──
  { id: 'element', prompt: 'Name a chemical element', where: instance('Q11344') },
  { id: 'mineral', prompt: 'Name a mineral', where: instance('Q12089225'), minSitelinks: 8 },
  { id: 'gemstone', prompt: 'Name a gemstone', where: kind('Q83437'), minSitelinks: 5 },
  { id: 'rock', prompt: 'Name a type of rock', where: kind('Q8063'), minSitelinks: 8 },
  {
    id: 'programming-language',
    prompt: 'Name a programming language',
    where: instanceOrSub('Q9143'),
    minSitelinks: 8,
  },
  {
    id: 'console',
    prompt: 'Name a video game console',
    where:
      '{ ?item wdt:P31/wdt:P279* wd:Q17589470 . } UNION { ?item wdt:P31/wdt:P279* wd:Q941818 . }',
    minSitelinks: 3,
  },
  {
    id: 'web-browser',
    prompt: 'Name a web browser',
    where: instanceOrSub('Q6368'),
    minSitelinks: 3,
  },
  {
    id: 'operating-system',
    prompt: 'Name an operating system',
    where: instanceOrSub('Q9135'),
    minSitelinks: 5,
  },
  {
    id: 'car-maker',
    prompt: 'Name a car manufacturer',
    where: instanceOrSub('Q786820'),
    minSitelinks: 12,
  },
  { id: 'typeface', prompt: 'Name a typeface', where: instanceOrSub('Q17451'), minSitelinks: 3 },
  {
    id: 'physicist',
    prompt: 'Name a physicist',
    where: person('Q169470'),
    minSitelinks: 40,
    people: true,
  },
  {
    id: 'chemist',
    prompt: 'Name a chemist',
    where: person('Q593644'),
    minSitelinks: 40,
    people: true,
  },
  {
    id: 'mathematician',
    prompt: 'Name a mathematician',
    where: person('Q170790'),
    minSitelinks: 40,
    people: true,
  },
  {
    id: 'inventor',
    prompt: 'Name an inventor',
    where: person('Q205375'),
    minSitelinks: 30,
    people: true,
  },
  {
    id: 'nobel-physics',
    prompt: 'Name a Nobel Prize winner in Physics',
    where: '?item wdt:P166 wd:Q38104 .',
    people: true,
  },
  {
    id: 'nobel-literature',
    prompt: 'Name a Nobel Prize winner in Literature',
    where: '?item wdt:P166 wd:Q37922 .',
    people: true,
  },

  // ── Cultuur ──
  { id: 'instrument', prompt: 'Name a musical instrument', where: kind('Q34379'), minSitelinks: 8 },
  { id: 'dance', prompt: 'Name a dance', where: kind('Q11639'), minSitelinks: 8 },
  {
    id: 'music-genre',
    prompt: 'Name a music genre',
    where: instanceOrSub('Q188451'),
    minSitelinks: 15,
  },
  {
    id: 'board-game',
    prompt: 'Name a board game',
    where: instanceOrSub('Q131436'),
    minSitelinks: 5,
  },
  { id: 'card-game', prompt: 'Name a card game', where: instanceOrSub('Q142714'), minSitelinks: 5 },
  { id: 'opera', prompt: 'Name an opera', where: instance('Q1344'), minSitelinks: 8 },
  {
    id: 'painter',
    prompt: 'Name a painter',
    where: person('Q1028181'),
    minSitelinks: 45,
    people: true,
  },
  {
    id: 'composer',
    prompt: 'Name a classical composer',
    where: person('Q36834'),
    minSitelinks: 45,
    people: true,
  },
  {
    id: 'philosopher',
    prompt: 'Name a philosopher',
    where: person('Q4964182'),
    minSitelinks: 45,
    people: true,
  },
  { id: 'poet', prompt: 'Name a poet', where: person('Q49757'), minSitelinks: 50, people: true },
  {
    id: 'architect',
    prompt: 'Name an architect',
    where: person('Q42973'),
    minSitelinks: 30,
    people: true,
  },
  {
    id: 'sculptor',
    prompt: 'Name a sculptor',
    where: person('Q1281618'),
    minSitelinks: 30,
    people: true,
  },
  {
    id: 'film-director',
    prompt: 'Name a film director',
    where: person('Q2526255'),
    minSitelinks: 50,
    people: true,
  },
  {
    id: 'explorer',
    prompt: 'Name an explorer',
    where: person('Q11900058'),
    minSitelinks: 30,
    people: true,
  },
  {
    id: 'rapper',
    prompt: 'Name a rapper',
    where: person('Q2252262'),
    minSitelinks: 30,
    people: true,
  },
  {
    id: 'jazz-musician',
    prompt: 'Name a jazz musician',
    where: person('Q15981151'),
    minSitelinks: 25,
    people: true,
  },
  {
    id: 'shakespeare-play',
    prompt: 'Name a play by Shakespeare',
    where: workBy(LITERARY_WORK, 'P50', 'Q692'),
  },
  {
    id: 'beatles-song',
    prompt: 'Name a Beatles song or album',
    where: workBy(MUSICAL_WORK, 'P175', 'Q1299'),
  },
  {
    id: 'queen-song',
    prompt: 'Name a Queen song or album',
    where: workBy(MUSICAL_WORK, 'P175', 'Q15862'),
  },
  {
    id: 'michael-jackson-song',
    prompt: 'Name a Michael Jackson song or album',
    where: workBy(MUSICAL_WORK, 'P175', 'Q2831'),
  },
  { id: 'pixar-film', prompt: 'Name a Pixar film', where: workBy(FILM, 'P272', 'Q127552') },
  {
    id: 'disney-film',
    prompt: 'Name a Disney animated film',
    where: workBy(FILM, 'P272', 'Q191224'),
  },
  {
    id: 'hitchcock-film',
    prompt: 'Name a film by Alfred Hitchcock',
    where: workBy(FILM, 'P57', 'Q7374'),
  },
  {
    id: 'spielberg-film',
    prompt: 'Name a film by Steven Spielberg',
    where: workBy(FILM, 'P57', 'Q8877'),
  },
  {
    id: 'dickens-novel',
    prompt: 'Name a novel by Charles Dickens',
    where: workBy(LITERARY_WORK, 'P50', 'Q5686'),
  },
  {
    id: 'stephen-king-book',
    prompt: 'Name a book by Stephen King',
    where: workBy(LITERARY_WORK, 'P50', 'Q39829'),
  },
  {
    id: 'agatha-christie-book',
    prompt: 'Name a book by Agatha Christie',
    where: workBy(LITERARY_WORK, 'P50', 'Q35064'),
  },
  {
    id: 'van-gogh-painting',
    prompt: 'Name a painting by Van Gogh',
    where: workBy(PAINTING, 'P170', 'Q5582'),
    minSitelinks: 2,
  },
  {
    id: 'monet-painting',
    prompt: 'Name a painting by Monet',
    where: workBy(PAINTING, 'P170', 'Q296'),
  },
  {
    id: 'picasso-painting',
    prompt: 'Name a painting by Picasso',
    where: workBy(PAINTING, 'P170', 'Q5593'),
  },
  {
    id: 'rembrandt-painting',
    prompt: 'Name a painting by Rembrandt',
    where: workBy(PAINTING, 'P170', 'Q5598'),
  },
  {
    id: 'mozart-work',
    prompt: 'Name a work by Mozart',
    where: workBy(MUSICAL_WORK, 'P86', 'Q254'),
    minSitelinks: 2,
  },
  {
    id: 'beethoven-work',
    prompt: 'Name a work by Beethoven',
    where: workBy(MUSICAL_WORK, 'P86', 'Q255'),
    minSitelinks: 2,
  },
  {
    id: 'bach-work',
    prompt: 'Name a work by Bach',
    where: workBy(MUSICAL_WORK, 'P86', 'Q1339'),
    minSitelinks: 2,
  },
  {
    id: 'video-game',
    prompt: 'Name a video game',
    where: instanceOrSub('Q7889'),
    minSitelinks: 35,
  },
  { id: 'toy', prompt: 'Name a toy', where: kind('Q11422'), minSitelinks: 8 },
  { id: 'superhero', prompt: 'Name a superhero', where: instanceOrSub('Q188784'), minSitelinks: 5 },
  {
    id: 'greek-letter',
    prompt: 'Name a letter of the Greek alphabet',
    where: '?item wdt:P361 wd:Q8216 .',
  },
  { id: 'greek-god', prompt: 'Name a Greek god or goddess', where: instanceOrSub('Q22989102') },
  { id: 'norse-god', prompt: 'Name a Norse god or goddess', where: instanceOrSub('Q16513881') },
  {
    id: 'egyptian-god',
    prompt: 'Name an Egyptian god or goddess',
    where: instanceOrSub('Q146083'),
  },
  {
    id: 'hindu-deity',
    prompt: 'Name a Hindu deity',
    where: instanceOrSub('Q979507'),
    minSitelinks: 2,
  },
  {
    id: 'mythical-creature',
    prompt: 'Name a mythical creature',
    where: instanceOrSub('Q2239243'),
    minSitelinks: 8,
  },

  // ── Geschiedenis ──
  { id: 'us-president', prompt: 'Name a US president', where: held('Q11696'), people: true },
  { id: 'roman-emperor', prompt: 'Name a Roman emperor', where: held('Q842606'), people: true },
  { id: 'pope', prompt: 'Name a pope', where: held('Q19546'), minSitelinks: 10, people: true },
  {
    id: 'uk-prime-minister',
    prompt: 'Name a British prime minister',
    where: held('Q14211'),
    people: true,
  },

  // ── Sport ──
  { id: 'sport', prompt: 'Name a sport', where: instanceOrSub('Q349'), minSitelinks: 12 },
  { id: 'martial-art', prompt: 'Name a martial art', where: kind('Q11417'), minSitelinks: 5 },
  {
    id: 'tennis-player',
    prompt: 'Name a tennis player',
    where: person('Q10833314'),
    minSitelinks: 40,
    people: true,
  },
  {
    id: 'f1-driver',
    prompt: 'Name a Formula One driver',
    where: person('Q10841764'),
    minSitelinks: 25,
    people: true,
  },
  {
    id: 'chess-player',
    prompt: 'Name a chess player',
    where: person('Q10873124'),
    minSitelinks: 25,
    people: true,
  },
  {
    id: 'football-club-uk',
    prompt: 'Name a British football club',
    where: '?item wdt:P31 wd:Q476028 ; wdt:P17 wd:Q145 .',
    minSitelinks: 10,
  },
  {
    id: 'nba-team',
    prompt: 'Name an NBA team',
    where: '?item wdt:P118 wd:Q155223 ; wdt:P31/wdt:P279* wd:Q13393265 .',
  },
  {
    id: 'nfl-team',
    prompt: 'Name an NFL team',
    where: '?item wdt:P118 wd:Q1215884 ; wdt:P31/wdt:P279* wd:Q17156793 .',
  },
];
