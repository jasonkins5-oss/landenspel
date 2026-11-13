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
 * Kandidaat-statistieken. Het fetch-script slaat er automatisch een over als er geen jaar is
 * met genoeg dekking, als er negatieve waarden in zitten of als de eerste plaats gedeeld wordt.
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
  { id: 'share-children', wbCode: 'SP.POP.0014.TO.ZS', question: 'Welk land heeft het hoogste aandeel kinderen (0–14 jaar)?', unit: '%', format: 'fixed', decimals: 1 },
  { id: 'forest-area', wbCode: 'AG.LND.FRST.K2', question: 'Welk land heeft de grootste bosoppervlakte?', unit: 'km²', format: 'compact', decimals: 1 },
  { id: 'forest-share', wbCode: 'AG.LND.FRST.ZS', question: 'Welk land is procentueel het meest bebost?', unit: '% van het land', format: 'fixed', decimals: 1 },
  { id: 'arable-share', wbCode: 'AG.LND.ARBL.ZS', question: 'Welk land heeft procentueel de meeste akkerbouwgrond?', unit: '% van het land', format: 'fixed', decimals: 1 },
  { id: 'mobile-subscriptions', wbCode: 'IT.CEL.SETS.P2', question: 'Welk land heeft de meeste mobiele abonnementen per 100 inwoners?', unit: 'per 100 inwoners', format: 'fixed', decimals: 0 },
  { id: 'military-spending', wbCode: 'MS.MIL.XPND.GD.ZS', question: 'Welk land besteedt het grootste deel van zijn bbp aan defensie?', unit: '% van het bbp', format: 'fixed', decimals: 1 },
  { id: 'health-spending', wbCode: 'SH.XPD.CHEX.PC.CD', question: 'Welk land heeft de hoogste zorguitgaven per inwoner?', unit: 'US$', format: 'fixed', decimals: 0 },
  { id: 'unemployment', wbCode: 'SL.UEM.TOTL.ZS', question: 'Welk land heeft de hoogste werkloosheid?', unit: '%', format: 'fixed', decimals: 1 },
  { id: 'child-mortality', wbCode: 'SH.DYN.MORT', question: 'Welk land heeft de hoogste kindersterfte (onder de 5 jaar)?', unit: 'per 1000 geboorten', format: 'fixed', decimals: 1 },
  { id: 'air-pollution', wbCode: 'EN.ATM.PM25.MC.M3', question: 'Welk land heeft de hoogste gemiddelde fijnstofconcentratie (PM2,5)?', unit: 'µg/m³', format: 'fixed', decimals: 1 },
  { id: 'exports-share', wbCode: 'NE.EXP.GNFS.ZS', question: 'Welk land heeft de hoogste export als percentage van het bbp?', unit: '% van het bbp', format: 'fixed', decimals: 0 },
  { id: 'remittances', wbCode: 'BX.TRF.PWKR.DT.GD.ZS', question: 'Welk land ontvangt de meeste geldovermakingen van migranten (als % van het bbp)?', unit: '% van het bbp', format: 'fixed', decimals: 1 },
  { id: 'tourist-arrivals', wbCode: 'ST.INT.ARVL', question: 'Welk land ontvangt de meeste internationale toeristen?', unit: 'bezoekers', format: 'compact', decimals: 1 },
  { id: 'co2-per-capita', wbCode: 'EN.GHG.CO2.PC.CE.AR5', question: 'Welk land heeft de hoogste CO₂-uitstoot per inwoner?', unit: 'ton per inwoner', format: 'fixed', decimals: 1 },
  { id: 'renewable-energy', wbCode: 'EG.FEC.RNEW.ZS', question: 'Welk land haalt het grootste deel van zijn energie uit hernieuwbare bronnen?', unit: '% van het energieverbruik', format: 'fixed', decimals: 1 },
  { id: 'agriculture-jobs', wbCode: 'SL.AGR.EMPL.ZS', question: 'Welk land heeft het hoogste aandeel werkenden in de landbouw?', unit: '% van de werkenden', format: 'fixed', decimals: 1 },
  { id: 'women-in-parliament', wbCode: 'SG.GEN.PARL.ZS', question: 'Welk land heeft het hoogste aandeel vrouwen in het parlement?', unit: '% van de zetels', format: 'fixed', decimals: 1 },
];
