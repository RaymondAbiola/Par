import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { discoverRegistry } from "../src/core/registry/discover";

const OUT = resolve(import.meta.dirname, "../src/core/registry/snapshot.json");

const { registry, failures } = await discoverRegistry({
  concurrency: 3,
  onProgress: (done, total, phase) => {
    if (done % 25 === 0 || done === total) {
      process.stdout.write(`\r  ${phase}: ${done}/${total}          `);
    }
  },
});

const wrappers = registry.listings.reduce((n, l) => n + l.wrappers.length, 0);
const multi = registry.listings.filter((l) => l.wrappers.length > 1).length;

console.log(`\n  ${registry.listings.length} listings, ${wrappers} wrappers, ${multi} multi-issuer`);

if (failures.length > 0) {
  console.error(`\n  ${failures.length} tickers failed after retry: ${failures.join(", ")}`);
  console.error("  snapshot NOT written");
  process.exit(1);
}

writeFileSync(OUT, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`  written to ${OUT}`);
