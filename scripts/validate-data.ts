/** Controleert de gecommitte JSON in src/data/. Draaien met `npm run data:validate`. */
import { baseScore, bestValue, kForStat, spreadOrders } from '../src/core/scoring';
import { countries, stats } from '../src/data';
import { validateData } from '../src/data/validate';

const errors = validateData(countries, stats);

console.log(`${countries.length} landen, ${stats.length} statistieken\n`);
console.log('statistiek             jaar  landen  spreiding      K   #2  #10  mediaan');
for (const s of [...stats].sort((a, b) => spreadOrders(a) - spreadOrders(b))) {
  const desc = Object.values(s.values).sort((a, b) => b - a);
  const k = kForStat(s);
  const best = bestValue(s);
  const at = (rank: number) => String(baseScore(desc[rank - 1], best, k)).padStart(4);
  const median = desc.filter((v) => v > 0).reverse()[Math.floor(desc.filter((v) => v > 0).length / 2)];
  console.log(
    `${s.id.padEnd(22)} ${s.year}  ${String(desc.length).padStart(6)}  ${spreadOrders(s).toFixed(2).padStart(9)}` +
      `  ${k.toFixed(2).padStart(5)} ${at(2)} ${at(10)}  ${String(baseScore(median, best, k)).padStart(7)}`,
  );
}

if (errors.length > 0) {
  console.error(`\n${errors.length} fout(en):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('\nData is in orde.');
