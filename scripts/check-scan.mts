import { getBestVenue } from "../src/core/par/normalize";
import { scanDislocations } from "../src/core/par/scan";
import { getSession } from "../src/core/prices/session";

const state = getSession();
console.log(`\n  ${state.eastern}  session=${state.session}\n`);

const results = await scanDislocations({ maxTickers: 25, maxLiveQuotes: 25 });

console.log(`  ${"TKR".padEnd(7)}${"SPREAD".padStart(9)}   ${"CHEAPEST".padEnd(16)}${"DEAREST".padEnd(16)}${"BEST LIQ".padStart(12)}   SOURCE`);
console.log(`  ${"-".repeat(84)}`);

for (const t of results.slice(0, 12)) {
  if (t.spreadBps === null) continue;
  const priced = t.wrappers.filter((w) => w.premiumBps !== null);
  const cheap = priced.reduce((a, b) => (a.premiumBps! < b.premiumBps! ? a : b));
  const dear = priced.reduce((a, b) => (a.premiumBps! > b.premiumBps! ? a : b));
  const liq = Math.max(...t.wrappers.map((w) => w.liquidityUsd ?? 0));

  console.log(
    `  ${t.ticker.padEnd(7)}${(t.spreadBps / 100).toFixed(2).padStart(7)}pp   ` +
      `${`${cheap.symbol} ${(cheap.premiumBps! / 100).toFixed(1)}%`.padEnd(16)}` +
      `${`${dear.symbol} ${(dear.premiumBps! / 100).toFixed(1)}%`.padEnd(16)}` +
      `${`$${Math.round(liq).toLocaleString()}`.padStart(12)}   ${t.reference?.source ?? "--"}`,
  );
}

const spreads = results.flatMap((t) => (t.spreadBps === null ? [] : [t.spreadBps / 100]));
spreads.sort((a, b) => a - b);
console.log(`\n  scanned ${results.length} multi-issuer tickers`);
console.log(`  median spread ${spreads[Math.floor(spreads.length / 2)]?.toFixed(2)}pp   widest ${spreads.at(-1)?.toFixed(2)}pp`);

const target = results[0]?.ticker;
if (target) {
  console.log(`\n  --- best venue for $10,000 of ${target}, with measured depth ---`);
  const choice = await getBestVenue(target, 10_000, "buy");
  for (const c of choice?.candidates ?? []) {
    const cost = c.execution?.allInBps ?? c.premiumBps;
    console.log(
      `    ${String(c.rank)}. ${c.symbol.padEnd(9)}` +
        `all-in ${cost === null ? "--" : `${(cost / 100).toFixed(2)}%`}`.padEnd(16) +
        `${c.recommendable ? "tradeable" : `excluded: ${c.excludedBecause}`}`,
    );
  }
  if (choice?.best) console.log(`\n    best: ${choice.best.symbol}`);
  if (choice?.savingUsd !== null && choice?.savingUsd !== undefined) {
    console.log(`    saving vs next tradeable: $${choice.savingUsd.toFixed(2)} on $10,000`);
  }
}
