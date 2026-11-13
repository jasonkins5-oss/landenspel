/** Een antwoord dat de speler kan typen: een land, een dier, … */
export interface Item {
  /** Stabiele sleutel. Voor landen de ISO 3166-1 alpha-3 (Kosovo: World Bank-code XKX). */
  id: string;
  nameNl: string;
  nameEn: string;
  /** Extra namen waarop de speler mag zoeken (afkortingen, oude namen, spreektaal). */
  aliases: string[];
}

export interface Country extends Item {
  /** ISO 3166-1 alpha-2 (Kosovo: XK). Voor de vlag-emoji. */
  iso2: string;
}

export type StatFormat = 'compact' | 'fixed';

export interface Stat {
  /** Stabiele slug, bv. "life-expectancy". */
  id: string;
  /** Volledige vraag, bv. "Welk land heeft de hoogste levensverwachting?" */
  question: string;
  /** Eenheid achter de waarde, bv. "jaar", "%", "km²". */
  unit: string;
  /** 'compact' = 1,2 mln; 'fixed' = vast aantal decimalen. */
  format: StatFormat;
  decimals: number;
  /** Peiljaar van alle waarden in deze statistiek. */
  year: number;
  source: string;
  sourceUrl: string;
  /** Item-id -> waarde. Ontbrekend item = geen data. Waarden zijn >= 0. */
  values: Record<string, number>;
}

export type CategoryId = 'landen' | 'dieren' | 'sport';

export interface Category {
  id: CategoryId;
  /** Naam op het keuzescherm, bv. "Dieren". */
  title: string;
  /** Eén regel uitleg, bv. "Welk dier is het snelst, zwaarst, oudst?" */
  tagline: string;
  /** Emoji voor het keuzescherm. */
  emoji: string;
  /** Placeholder in het invoerveld, bv. "Typ een dier…". */
  placeholder: string;
  /** Wat de speler intypt, enkelvoud: "land", "dier". */
  noun: string;
  /** Bronvermelding voor de voettekst. */
  attribution: { text: string; url: string };
  /** Minimaal aantal items met een waarde per statistiek (validatie). */
  minCoverage: number;
  items: Item[];
  stats: Stat[];
}
