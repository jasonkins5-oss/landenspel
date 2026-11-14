/**
 * Pixel-sprites als SVG. Elke sprite is een raster van tekens; elk teken verwijst naar een kleur
 * in het palet, '.' is transparant. Opeenvolgende pixels met dezelfde kleur worden één <rect>.
 */
export function sprite(
  rows: readonly string[],
  palette: Record<string, string>,
  scale: number,
  className = '',
): string {
  const width = Math.max(...rows.map((r) => r.length));
  const rects: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let run = 1;
      while (row[x + run] === ch) run++;
      const fill = palette[ch];
      if (ch !== '.' && fill)
        rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  });
  return (
    `<svg class="${className}" viewBox="0 0 ${width} ${rows.length}" width="${width * scale}" height="${rows.length * scale}"` +
    ` shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join('')}</svg>`
  );
}

const K = '#141c2b';

export const DIGGER = sprite(
  [
    '......................',
    '..........KKKKK.......',
    '.........KYYYYYK......',
    '....KKKKKYWWWWYK......',
    '....KYYYYYWWWWYK..KKK.',
    '....KYYYYYYYYYYKKKYYK.',
    '..KKKYYYYYYYYYYYYKYYK.',
    '..KDDDDDDDDDDDDDDK.KYK',
    '.KKKKKKKKKKKKKKKKK..KYK',
    'KGGKGGKGGKGGKGGKGGK.KDK',
    'KGGKGGKGGKGGKGGKGGK.KKK',
    '.KKKKKKKKKKKKKKKKK.....',
  ],
  { K, Y: '#f2b632', D: '#c4861d', W: '#9fe3ff', G: '#8a96a3' },
  4,
  'digger',
);

export const DRILL = sprite(
  [
    '.KKKKKKK.',
    'KGGGGGGGK',
    'KGWGGGWGK',
    'KKKKKKKKK',
    '.KYYYYYK.',
    '.KYDYYDK.',
    '..KYYYK..',
    '..KDYDK..',
    '...KYK...',
    '...KDK...',
    '....K....',
  ],
  { K, Y: '#f2b632', D: '#c4861d', W: '#e8f0f8', G: '#8a96a3' },
  4,
  'drill',
);

export const CLOUD = sprite(
  [
    '......WWWW..........',
    '....WWWWWWWW...WWW..',
    '..WWWWWWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWWWWWW',
    'SSSSSSSSSSSSSSSSSSSS',
  ],
  { W: '#ffffff', S: '#d6ecfa' },
  6,
  'cloud',
);

export const SUN = sprite(
  [
    '....YYYY....',
    '..YYYYYYYY..',
    '.YYYYYYYYYY.',
    '.YYYYYYYYYY.',
    'YYYYYYYYYYYY',
    'YYYYYYYYYYYY',
    'YYYYYYYYYYYY',
    'YYYYYYYYYYYY',
    '.YYYYYYYYYY.',
    '.YYYYYYYYYY.',
    '..YYYYYYYY..',
    '....YYYY....',
  ],
  { Y: '#ffd862' },
  7,
  'sun',
);

export const ICON_MENU = sprite(
  ['.......', 'WWWWWWW', '.......', 'WWWWWWW', '.......', 'WWWWWWW', '.......'],
  { W: '#e8f0f8' },
  2,
  'icon',
);

export const ICON_SOUND_ON = sprite(
  ['...W.....', '..WW..W..', 'WWWW...W.', 'WWWW.W.W.', 'WWWW...W.', '..WW..W..', '...W.....'],
  { W: '#e8f0f8' },
  2,
  'icon',
);

export const ICON_SOUND_OFF = sprite(
  ['...W.....', '..WW.....', 'WWWW.W.W.', 'WWWW..W..', 'WWWW.W.W.', '..WW.....', '...W.....'],
  { W: '#e8f0f8' },
  2,
  'icon',
);
