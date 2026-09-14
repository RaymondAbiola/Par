import { sql } from "../src/core/db/client";
import { getCoverage, getSessionStats } from "../src/core/db/history";

const db = sql();
const [info] = (await db.query("select version(), current_database() as db")) as Record<string, unknown>[];

// never print the connection string: host only, so a mistake is visible without leaking credentials
const host = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/\/.*$/, "");

console.log(`\n  connected to ${info?.db} at ${host}`);
console.log(`  ${String(info?.version).split(",")[0]}`);

const coverage = await getCoverage();
console.log(`\n  rows: ${coverage.rows}   runs: ${coverage.runs}   since: ${coverage.since ?? "never"}`);

const stats = await getSessionStats(168);
if (stats.length === 0) {
  console.log("  no session stats yet, capture has not run enough times");
} else {
  console.log(`\n  ${"SESSION".padEnd(12)}${"SAMPLES".padStart(9)}${"MEDIAN SPREAD".padStart(16)}${"MEAN |PREMIUM|".padStart(16)}`);
  for (const s of stats) {
    console.log(
      `  ${s.session.padEnd(12)}${String(s.samples).padStart(9)}${`${(s.medianSpreadBps / 100).toFixed(2)}pp`.padStart(16)}${`${(s.meanAbsPremiumBps / 100).toFixed(2)}%`.padStart(16)}`,
    );
  }
}
