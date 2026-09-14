import { getParSnapshot, rankWrappers } from "../src/core/par/engine";
import { getSession } from "../src/core/prices/session";

const TICKERS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "META", "AMZN", "SPY", "QQQ", "AMD", "COIN", "NFLX", "CRCL", "ORCL", "PLTR"];

const state = getSession();
console.log(`\n  ${state.eastern}  session=${state.session}  live=${state.live}\n`);

const snapshot = await getParSnapshot(TICKERS);
const bySpread = [...snapshot].sort((a, b) => (b.spreadBps ?? -1) - (a.spreadBps ?? -1));

console.log(
  `  ${"TKR".padEnd(7)}${"SHARE".padStart(9)}   ${"WRAPPER".padEnd(9)}${"PRICE".padStart(9)}${"PREM".padStart(9)}${"LIQUIDITY".padStart(13)}${"SPREAD".padStart(10)}`,
);
console.log(`  ${"-".repeat(70)}`);

for (const t of bySpread) {
  if (!t.reference) continue;
  const ranked = rankWrappers(t.wrappers, "buy");
  let first = true;

  for (const w of ranked) {
    const prem = w.premiumBps === null ? "--" : `${(w.premiumBps / 100).toFixed(2)}%`;
    const liq = w.liquidityUsd === null ? "--" : `$${Math.round(w.liquidityUsd).toLocaleString()}`;
    const spread = first && t.spreadBps !== null ? `${(t.spreadBps / 100).toFixed(2)}pp` : "";
    console.log(
      `  ${(first ? t.ticker : "").padEnd(7)}${(first ? t.reference.price.toFixed(2) : "").padStart(9)}   ` +
        `${w.symbol.padEnd(9)}${(w.pricePerShare?.toFixed(2) ?? "--").padStart(9)}${prem.padStart(9)}${liq.padStart(13)}${spread.padStart(10)}` +
        `${w.multiplier?.stale ? "  STALE" : ""}`,
    );
    first = false;
  }
}

const spreads = snapshot.flatMap((t) => (t.spreadBps === null ? [] : [t.spreadBps / 100]));
const stale = snapshot.flatMap((t) => t.wrappers.filter((w) => w.multiplier?.stale));
console.log(`\n  basis: ${bySpread[0]?.reference?.basis ?? "--"}`);
console.log(`  median cross-issuer spread: ${spreads.sort((a, b) => a - b)[Math.floor(spreads.length / 2)]?.toFixed(2)}pp`);
console.log(`  widest: ${Math.max(...spreads).toFixed(2)}pp   stale multipliers in view: ${stale.length}`);
