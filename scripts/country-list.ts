/**
 * Bronlijst van landen: de 193 VN-leden plus Kosovo, Hongkong en Palestina.
 * Taiwan ontbreekt bewust, omdat de World Bank er geen cijfers voor publiceert.
 *
 * Formaat: "ISO3:ISO2". Namen worden gegenereerd met Intl.DisplayNames (nl/en),
 * met handmatige correcties in NAME_OVERRIDES.
 */
const UN_MEMBERS = `
AFG:AF ALB:AL DZA:DZ AND:AD AGO:AO ATG:AG ARG:AR ARM:AM AUS:AU AUT:AT AZE:AZ BHS:BS
BHR:BH BGD:BD BRB:BB BLR:BY BEL:BE BLZ:BZ BEN:BJ BTN:BT BOL:BO BIH:BA BWA:BW BRA:BR
BRN:BN BGR:BG BFA:BF BDI:BI CPV:CV KHM:KH CMR:CM CAN:CA CAF:CF TCD:TD CHL:CL CHN:CN
COL:CO COM:KM COG:CG COD:CD CRI:CR CIV:CI HRV:HR CUB:CU CYP:CY CZE:CZ DNK:DK DJI:DJ
DMA:DM DOM:DO ECU:EC EGY:EG SLV:SV GNQ:GQ ERI:ER EST:EE SWZ:SZ ETH:ET FJI:FJ FIN:FI
FRA:FR GAB:GA GMB:GM GEO:GE DEU:DE GHA:GH GRC:GR GRD:GD GTM:GT GIN:GN GNB:GW GUY:GY
HTI:HT HND:HN HUN:HU ISL:IS IND:IN IDN:ID IRN:IR IRQ:IQ IRL:IE ISR:IL ITA:IT JAM:JM
JPN:JP JOR:JO KAZ:KZ KEN:KE KIR:KI PRK:KP KOR:KR KWT:KW KGZ:KG LAO:LA LVA:LV LBN:LB
LSO:LS LBR:LR LBY:LY LIE:LI LTU:LT LUX:LU MDG:MG MWI:MW MYS:MY MDV:MV MLI:ML MLT:MT
MHL:MH MRT:MR MUS:MU MEX:MX FSM:FM MDA:MD MCO:MC MNG:MN MNE:ME MAR:MA MOZ:MZ MMR:MM
NAM:NA NRU:NR NPL:NP NLD:NL NZL:NZ NIC:NI NER:NE NGA:NG MKD:MK NOR:NO OMN:OM PAK:PK
PLW:PW PAN:PA PNG:PG PRY:PY PER:PE PHL:PH POL:PL PRT:PT QAT:QA ROU:RO RUS:RU RWA:RW
KNA:KN LCA:LC VCT:VC WSM:WS SMR:SM STP:ST SAU:SA SEN:SN SRB:RS SYC:SC SLE:SL SGP:SG
SVK:SK SVN:SI SLB:SB SOM:SO ZAF:ZA SSD:SS ESP:ES LKA:LK SDN:SD SUR:SR SWE:SE CHE:CH
SYR:SY TJK:TJ TZA:TZ THA:TH TLS:TL TGO:TG TON:TO TTO:TT TUN:TN TUR:TR TKM:TM TUV:TV
UGA:UG UKR:UA ARE:AE GBR:GB USA:US URY:UY UZB:UZ VUT:VU VEN:VE VNM:VN YEM:YE ZMB:ZM
ZWE:ZW
`;

const EXTRA_TERRITORIES = `XKX:XK HKG:HK PSE:PS`;

export interface CountryCode {
  iso3: string;
  iso2: string;
}

const parse = (block: string): CountryCode[] =>
  block
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [iso3, iso2] = pair.split(':');
      if (!iso3 || !iso2) throw new Error(`Ongeldig paar: ${pair}`);
      return { iso3, iso2 };
    });

export const UN_MEMBER_CODES = parse(UN_MEMBERS);
export const COUNTRY_CODES: CountryCode[] = [...UN_MEMBER_CODES, ...parse(EXTRA_TERRITORIES)];

/** Correcties op Intl.DisplayNames, waar die een lange of officiële vorm geeft. */
export const NAME_OVERRIDES: Record<string, { nl?: string; en?: string }> = {
  HKG: { nl: 'Hongkong', en: 'Hong Kong' },
  PSE: { nl: 'Palestina', en: 'Palestine' },
  XKX: { nl: 'Kosovo', en: 'Kosovo' },
  MMR: { nl: 'Myanmar', en: 'Myanmar' },
  COD: { nl: 'Congo-Kinshasa', en: 'DR Congo' },
  COG: { nl: 'Congo-Brazzaville', en: 'Republic of the Congo' },
  CIV: { nl: 'Ivoorkust', en: 'Ivory Coast' },
  FSM: { nl: 'Micronesia', en: 'Micronesia' },
  KNA: { nl: 'Saint Kitts en Nevis', en: 'Saint Kitts and Nevis' },
  VCT: { nl: 'Saint Vincent en de Grenadines', en: 'Saint Vincent and the Grenadines' },
  BIH: { nl: 'Bosnië en Herzegovina', en: 'Bosnia and Herzegovina' },
  ATG: { nl: 'Antigua en Barbuda', en: 'Antigua and Barbuda' },
  TTO: { nl: 'Trinidad en Tobago', en: 'Trinidad and Tobago' },
  STP: { nl: 'Sao Tomé en Principe', en: 'São Tomé and Príncipe' },
};

/** Zoekaliassen: afkortingen, oude namen en spreektaal (Nederlands en Engels). */
export const ALIASES: Record<string, string[]> = {
  USA: ['VS', 'USA', 'US', 'Amerika', 'Verenigde Staten van Amerika', 'America', 'United States of America'],
  GBR: ['VK', 'UK', 'Groot-Brittannië', 'Engeland', 'Great Britain', 'Britain', 'England'],
  NLD: ['Holland', 'The Netherlands'],
  ARE: ['VAE', 'UAE', 'Emiraten', 'Emirates'],
  KOR: ['Korea', 'Zuid Korea', 'Republic of Korea'],
  PRK: ['Noord Korea', 'DPRK'],
  COD: ['DR Congo', 'DRC', 'Democratische Republiek Congo', 'Congo-Kinshasa', 'Democratic Republic of the Congo', 'Zaïre', 'Zaire'],
  COG: ['Congo', 'Republiek Congo', 'Congo-Brazzaville'],
  CIV: ["Côte d'Ivoire", 'Cote dIvoire'],
  CZE: ['Tsjechische Republiek', 'Czech Republic', 'Czechia'],
  SWZ: ['Swaziland', 'Eswatini'],
  MMR: ['Birma', 'Burma'],
  TUR: ['Türkiye', 'Turkiye', 'Turkey'],
  MKD: ['Macedonië', 'Macedonia'],
  CPV: ['Cabo Verde', 'Cape Verde'],
  TLS: ['Oost-Timor', 'East Timor', 'Timor-Leste'],
  RUS: ['Russische Federatie', 'Russian Federation'],
  IRN: ['Perzië', 'Persia'],
  LKA: ['Ceylon'],
  BLR: ['Wit-Rusland', 'Belarus'],
  SAU: ['Saoedi-Arabië', 'Saudi-Arabië', 'Saudi Arabia', 'Saudi'],
  BIH: ['Bosnië', 'Bosnia'],
  CAF: ['CAR', 'Centraal-Afrikaanse Republiek'],
  DOM: ['Dominicaanse Republiek', 'Dominican Republic'],
  VNM: ['Viet Nam'],
  LAO: ['Laos'],
  SYR: ['Syrië'],
  FSM: ['Federated States of Micronesia'],
  NZL: ['NZ'],
  ZAF: ['RSA', 'Zuid Afrika'],
  PNG: ['PNG'],
  CHE: ['Zwitserland'],
  DEU: ['Duitsland', 'Germany'],
};
