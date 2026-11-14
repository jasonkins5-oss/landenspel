import type { Item, Stat } from '../data/types';

export interface RankedItem<T extends Item = Item> {
  item: T;
  value: number;
  /** 1 = hoogste waarde. */
  rank: number;
}

/** Alle items met een waarde, van hoog naar laag. Items zonder data vallen weg. */
export function rankItems<T extends Item>(stat: Stat, items: readonly T[]): RankedItem<T>[] {
  const byId = new Map(items.map((c) => [c.id, c]));
  return Object.entries(stat.values)
    .flatMap(([id, value]) => {
      const item = byId.get(id);
      return item ? [{ item, value }] : [];
    })
    .sort((a, b) => b.value - a.value || a.item.nameNl.localeCompare(b.item.nameNl, 'nl'))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function rankOf<T extends Item>(
  ranking: readonly RankedItem<T>[],
  id: string,
): RankedItem<T> | undefined {
  return ranking.find((r) => r.item.id === id);
}

export function topN<T extends Item>(ranking: readonly RankedItem<T>[], n = 5): RankedItem<T>[] {
  return ranking.slice(0, n);
}
