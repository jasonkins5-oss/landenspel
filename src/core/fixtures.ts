import type { Answer, PromptMeta } from './answers';

/** Kleine, vaste antwoordlijst voor tests: van bekend naar onbekend. */
export const DOGS: Answer[] = [
  { id: 'Q38280', name: 'German Shepherd', aliases: ['Alsatian', 'GSD'], sitelinks: 92 },
  { id: 'Q38383', name: 'Labrador Retriever', aliases: ['Labrador', 'Lab'], sitelinks: 81 },
  { id: 'Q21102', name: 'Beagle', aliases: [], sitelinks: 72 },
  { id: 'Q38904', name: 'Poodle', aliases: ['Caniche'], sitelinks: 65 },
  { id: 'Q39054', name: 'Golden Retriever', aliases: ['Goldie'], sitelinks: 60 },
  { id: 'Q38839', name: 'Dachshund', aliases: ['Sausage dog', 'Wiener dog'], sitelinks: 58 },
  { id: 'Q38967', name: 'Siberian Husky', aliases: ['Husky'], sitelinks: 50 },
  { id: 'Q39176', name: 'Shiba Inu', aliases: [], sitelinks: 40 },
  { id: 'Q41181', name: 'Bull Terrier', aliases: [], sitelinks: 35 },
  { id: 'Q39183', name: 'Afghan Hound', aliases: [], sitelinks: 33 },
  { id: 'Q39220', name: 'Puli', aliases: [], sitelinks: 25 },
  { id: 'Q38978', name: 'Pumi', aliases: [], sitelinks: 18 },
  { id: 'Q1191540', name: 'Lagotto Romagnolo', aliases: [], sitelinks: 15 },
  {
    id: 'Q26718',
    name: 'Xoloitzcuintle',
    aliases: ['Mexican hairless dog', 'Xolo'],
    sitelinks: 12,
  },
  { id: 'Q5000001', name: 'Plott Hound', aliases: [], sitelinks: 6 },
  { id: 'Q5000002', name: 'Leopard Tree Dog', aliases: [], sitelinks: 1 },
];

/** Tien nep-vragen voor puzzeltests. */
export const PROMPTS: PromptMeta[] = Array.from({ length: 10 }, (_, i) => ({
  id: `prompt-${String(i).padStart(2, '0')}`,
  prompt: `Name thing ${i}`,
  count: 100,
}));
