import { getReferencePrices } from "../src/core/prices/reference";
import { getSession, SESSION_LABEL } from "../src/core/prices/session";

const TICKERS = ["NVDA", "TSLA", "AAPL", "SPY", "NFLX", "CRCL", "AMD", "MSFT"];

const state = getSession();
console.log(`\n  ${state.eastern}`);
console.log(`  session: ${state.session} (${SESSION_LABEL[state.session]})  live=${state.live}\n`);

const prices = await getReferencePrices(TICKERS);

console.log(`  ${"TICKER".padEnd(8)}${"PRICE".padStart(10)}${"SOURCE".padStart(16)}${"AGE".padStart(10)}   BASIS`);
console.log(`  ${"-".repeat(62)}`);
for (const ticker of TICKERS) {
  const p = prices.get(ticker);
  if (!p) {
    console.log(`  ${ticker.padEnd(8)}${"--".padStart(10)}`);
    continue;
  }
  const age = p.ageSeconds > 3600 ? `${Math.round(p.ageSeconds / 3600)}h` : `${p.ageSeconds}s`;
  console.log(
    `  ${ticker.padEnd(8)}${p.price.toFixed(2).padStart(10)}${p.source.padStart(16)}${age.padStart(10)}   ${p.basis}`,
  );
}
console.log(`\n  resolved ${prices.size}/${TICKERS.length}`);
