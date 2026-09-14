import { hasDatabase } from "../src/core/db/client";
import { insertSnapshot, toSnapshotRows } from "../src/core/db/history";
import { scanDislocations } from "../src/core/par/scan";
import { getSession } from "../src/core/prices/session";

if (!hasDatabase()) {
  console.error("  DATABASE_URL is not set, nothing to capture into");
  process.exit(1);
}

const state = getSession();
const started = Date.now();

const results = await scanDislocations({ maxTickers: 40, maxLiveQuotes: 30, minLiquidityUsd: 25_000 });
const rows = toSnapshotRows(results);
const written = await insertSnapshot(rows);

const spreads = results.flatMap((r) => (r.spreadBps === null ? [] : [r.spreadBps / 100]));
spreads.sort((a, b) => a - b);

console.log(
  `  ${state.eastern}  session=${state.session}  tickers=${results.length}  rows=${written}  ` +
    `median=${spreads[Math.floor(spreads.length / 2)]?.toFixed(2) ?? "--"}pp  ` +
    `widest=${spreads.at(-1)?.toFixed(2) ?? "--"}pp  ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
