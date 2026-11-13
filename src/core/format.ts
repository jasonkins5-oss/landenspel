import type { Stat } from '../data/types';

/** Compacte notatie met een Nederlands scheidingsteken: 1,2 mln, 3,4 mld. */
function compact(value: number, decimals: number): string {
  const abs = Math.abs(value);
  const fmt = (v: number, suffix: string) =>
    `${v.toLocaleString('nl-NL', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} ${suffix}`;
  if (abs >= 1_000_000_000) return fmt(value / 1_000_000_000, 'mld');
  if (abs >= 1_000_000) return fmt(value / 1_000_000, 'mln');
  if (abs >= 1_000) return fmt(value / 1_000, 'duizend');
  return value.toLocaleString('nl-NL', { maximumFractionDigits: decimals });
}

/** Geeft een waarde weer volgens het formaat van de statistiek, inclusief eenheid. */
export function formatValue(stat: Stat, value: number): string {
  const number =
    stat.format === 'compact'
      ? compact(value, stat.decimals)
      : value.toLocaleString('nl-NL', {
          minimumFractionDigits: stat.decimals,
          maximumFractionDigits: stat.decimals,
        });
  return stat.unit ? `${number} ${stat.unit}` : number;
}

export function formatSeconds(seconds: number): string {
  return `${Math.max(0, Math.ceil(seconds))}s`;
}
