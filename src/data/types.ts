export interface Country {
  /** ISO 3166-1 alpha-3 (Kosovo: World Bank-code XKX). Primaire sleutel. */
  iso3: string;
  /** ISO 3166-1 alpha-2 (Kosovo: XK). Voor de vlag-emoji. */
  iso2: string;
  nameNl: string;
  nameEn: string;
  /** Extra namen waarop de speler mag zoeken (afkortingen, oude namen, spreektaal). */
  aliases: string[];
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
  /** ISO3 -> waarde. Ontbrekend land = geen data. Waarden zijn >= 0. */
  values: Record<string, number>;
}
