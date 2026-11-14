import type { Answer } from './answers';

/**
 * Zeldzaamheid van een antwoord. Krillion telt wat spelers antwoorden; wij ook, met een
 * startwaarde (prior) uit bekendheid zodat het spel vanaf de eerste speler werkt.
 *
 *   prior_i   ∝ sitelinks_i ^ PRIOR_EXPONENT, samen PRIOR_WEIGHT nep-antwoorden
 *   aandeel_i = (telling_i + prior_i) / (totaal + PRIOR_WEIGHT)
 *
 * Punten volgen de "verrassingswaarde" van je antwoord, op een logaritmische schaal tussen het
 * populairste antwoord (100 punten) en een antwoord dat nog nooit gegeven is en het minst
 * bekend is (1000 punten):
 *
 *   punten = 100 + 900 × ln(max / aandeel) / ln(max / bodem)
 *
 * Zo is er verschil tussen "vrij ongewoon" en "heel niche". (Een eerdere versie rekende met het
 * aandeel antwoorden dat gewoner is; dan haalde alles buiten de top tien al bijna 1000.)
 *
 * `rarerThan` (het aandeel antwoorden dat vaker gegeven wordt) tonen we als extra weetje.
 */
export const PRIOR_WEIGHT = 60;
export const PRIOR_EXPONENT = 3;
export const POINTS_CURVE = 1;
/** Aandeel van de plek in de rangorde in de punten; de rest is de verrassingswaarde. */
export const RANK_WEIGHT = 0.5;
export const MIN_POINTS = 100;
export const MAX_POINTS = 1000;

/** Spelerstellingen per antwoord-id voor één vraag. */
export type AnswerCounts = Readonly<Record<string, number>>;

export function priorWeights(answers: readonly Answer[]): number[] {
  const raw = answers.map((a) => Math.max(1, a.sitelinks) ** PRIOR_EXPONENT);
  const sum = raw.reduce((s, x) => s + x, 0);
  return raw.map((x) => (sum > 0 ? (x / sum) * PRIOR_WEIGHT : 0));
}

/** Geschat aandeel van elk antwoord onder alle spelers. Telt op tot 1. */
export function shares(answers: readonly Answer[], counts: AnswerCounts = {}): number[] {
  const prior = priorWeights(answers);
  const total = answers.reduce((s, a) => s + (counts[a.id] ?? 0), 0);
  return answers.map((a, i) => ((counts[a.id] ?? 0) + prior[i]!) / (total + PRIOR_WEIGHT));
}

export interface Rarity {
  points: number;
  /** Aandeel van de antwoorden dat vaker gegeven wordt dan dit (0–1): "rarer than 97%". */
  rarerThan: number;
  /** Geschat aandeel van dit antwoord zelf (0–1). */
  share: number;
}

/** Punten bij een genormaliseerde verrassingswaarde van 0 (populairst) tot 1 (diepst). */
export function pointsFor(surprise: number): number {
  const x = Math.min(1, Math.max(0, surprise));
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * x ** POINTS_CURVE);
}

/** Verrassingswaarde (0–1) van een aandeel, tussen het grootste aandeel en de bodem. */
export function surprise(share: number, maxShare: number, floorShare: number): number {
  if (share <= 0 || maxShare <= floorShare) return share > 0 && share < maxShare ? 1 : 0;
  return Math.log(maxShare / share) / Math.log(maxShare / floorShare);
}

/** Punten voor antwoord `index`, op basis van de tellingen van vóór dit antwoord. */
export function rarityOf(
  answers: readonly Answer[],
  index: number,
  counts: AnswerCounts = {},
): Rarity {
  const s = shares(answers, counts);
  const own = s[index] ?? 0;
  const rarerThan = s.reduce((sum, x, i) => (i !== index && x > own ? sum + x : sum), 0);
  const total = answers.reduce((sum, a) => sum + (counts[a.id] ?? 0), 0);
  const prior = priorWeights(answers);
  // Bodem: het minst bekende antwoord zonder één spelersantwoord.
  const floor = Math.min(...prior) / (total + PRIOR_WEIGHT);
  // Plek in de rangorde: hoeveel andere antwoorden zijn minstens zo gewoon? Dat helpt bij
  // vragen waar bijna alles bekend is (landen): daar zegt de verrassingswaarde alleen weinig.
  const asCommon = s.reduce((n, x, i) => (i !== index && x >= own ? n + 1 : n), 0);
  const rank = answers.length > 1 ? asCommon / (answers.length - 1) : 0;
  const points = pointsFor(
    RANK_WEIGHT * rank + (1 - RANK_WEIGHT) * surprise(own, Math.max(...s), floor),
  );
  return { points, rarerThan, share: own };
}

/** De vaakst gegeven antwoorden, met hun aandeel. */
export function mostCommon(
  answers: readonly Answer[],
  counts: AnswerCounts = {},
  n = 5,
): { answer: Answer; share: number }[] {
  const s = shares(answers, counts);
  return answers
    .map((answer, i) => ({ answer, share: s[i]! }))
    .sort((a, b) => b.share - a.share)
    .slice(0, n);
}

/**
 * Een paar "deep cuts": echte antwoorden uit de onbekendste 30%, maar met minstens een paar
 * Wikipedia-edities zodat het geen wartaal lijkt. Deterministisch via `rand`.
 */
export function deepCuts(
  answers: readonly Answer[],
  rand: () => number,
  n = 3,
  exclude?: string,
): Answer[] {
  const tail = answers.slice(Math.floor(answers.length * 0.7)).filter((a) => a.id !== exclude);
  const solid = tail.filter((a) => a.sitelinks >= 3);
  const pool = [...(solid.length >= n ? solid : tail)];
  const out: Answer[] = [];
  while (out.length < n && pool.length > 0)
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return out;
}
