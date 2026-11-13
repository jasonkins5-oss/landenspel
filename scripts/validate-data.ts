/** Controleert de gecommitte JSON in src/data/. Draaien met `npm run data:validate`. */
import { baseScore, bestValue, kForStat, spreadOrders } from '../src/core/scoring';
import { categories } from '../src/data';
import { validateCategory } from '../src/data/validate';

const errors = categories.flatMap((c) => validateCategory(c));

for (const category of categories) {
  console.log(`\n== ${category.title}: ${category.items.length} items, ${category.stats.length} statistieken\n`);
  console.log('statistiek                jaar  items  spreiding      K   #2  #10  mediaan');
  for (const s of [...category.stats].sort((a, b) => spreadOrders(a) - spreadOrders(b))) {
    const desc = Object.values(s.values).sort((a, b) => b - a);
    const positive = desc.filter((v) => v > 0);
    const k = kForStat(s);
    const best = bestValue(s);
    const at = (rank: number) => String(baseScore(desc[rank - 1], best, k)).padStart(4);
    const median = [...positive].reverse()[Math.floor(positive.length / 2)];
    console.log(
      `${s.id.padEnd(25)} ${s.year}  ${String(desc.length).padStart(5)}  ${spreadOrders(s).toFixed(2).padStart(9)}` +
        `  ${k.toFixed(2).padStart(5)} ${at(2)} ${at(10)}  ${String(baseScore(median, best, k)).padStart(7)}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`\n${errors.length} fout(en):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('\nData is in orde.');
