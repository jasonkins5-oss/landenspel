import type { StatFormat } from '../src/data/types';

export interface IndicatorDef {
  id: string;
  /** World Bank-indicatorcode. */
  wbCode: string;
  question: string;
  unit: string;
  format: StatFormat;
  decimals: number;
}

/**
 * Statistieken voor de categorie Landen. Bewust alleen bekende begrippen (inwoners, oppervlak,
 * bbp, …), zodat het spel makkelijk blijft. Het fetch-script slaat er automatisch een over als
 * er geen jaar is met genoeg dekking, als er negatieve waarden in zitten of als de eerste
 * plaats gedeeld wordt.
 */
export const INDICATORS: IndicatorDef[] = [
  { id: 'population', wbCode: 'SP.POP.TOTL', question: 'Welk land heeft de meeste inwoners?', unit: 'inwoners', format: 'compact', decimals: 1 },
  { id: 'land-area', wbCode: 'AG.LND.TOTL.K2', question: 'Welk land heeft het grootste landoppervlak?', unit: 'km²', format: 'compact', decimals: 1 },
  { id: 'gdp', wbCode: 'NY.GDP.MKTP.CD', question: 'Welk land heeft het hoogste bbp?', unit: 'US$', format: 'compact', decimals: 1 },
  { id: 'gdp-per-capita', wbCode: 'NY.GDP.PCAP.CD', question: 'Welk land heeft het hoogste bbp per inwoner?', unit: 'US$', format: 'fixed', decimals: 0 },
  { id: 'life-expectancy', wbCode: 'SP.DYN.LE00.IN', question: 'Welk land heeft de hoogste levensverwachting?', unit: 'jaar', format: 'fixed', decimals: 1 },
  { id: 'population-density', wbCode: 'EN.POP.DNST', question: 'Welk land heeft de hoogste bevolkingsdichtheid?', unit: 'inwoners per km²', format: 'fixed', decimals: 0 },
  { id: 'fertility', wbCode: 'SP.DYN.TFRT.IN', question: 'Welk land heeft het hoogste aantal kinderen per vrouw?', unit: 'kinderen per vrouw', format: 'fixed', decimals: 2 },
  { id: 'share-65-plus', wbCode: 'SP.POP.65UP.TO.ZS', question: 'Welk land heeft het hoogste aandeel 65-plussers?', unit: '%', format: 'fixed', decimals: 1 },
  { id: 'forest-area', wbCode: 'AG.LND.FRST.K2', question: 'Welk land heeft de grootste bosoppervlakte?', unit: 'km²', format: 'compact', decimals: 1 },
  { id: 'military-spending', wbCode: 'MS.MIL.XPND.GD.ZS', question: 'Welk land besteedt het grootste deel van zijn bbp aan defensie?', unit: '% van het bbp', format: 'fixed', decimals: 1 },
  { id: 'health-spending', wbCode: 'SH.XPD.CHEX.PC.CD', question: 'Welk land heeft de hoogste zorguitgaven per inwoner?', unit: 'US$', format: 'fixed', decimals: 0 },
  { id: 'unemployment', wbCode: 'SL.UEM.TOTL.ZS', question: 'Welk land heeft de hoogste werkloosheid?', unit: '%', format: 'fixed', decimals: 1 },
  { id: 'tourist-arrivals', wbCode: 'ST.INT.ARVL', question: 'Welk land ontvangt de meeste internationale toeristen?', unit: 'bezoekers', format: 'compact', decimals: 1 },
  { id: 'co2-per-capita', wbCode: 'EN.GHG.CO2.PC.CE.AR5', question: 'Welk land heeft de hoogste CO₂-uitstoot per inwoner?', unit: 'ton per inwoner', format: 'fixed', decimals: 1 },
];
