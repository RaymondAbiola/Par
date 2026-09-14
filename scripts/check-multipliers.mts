import { allListings } from "../src/core/registry/index";
import { fetchMultipliers } from "../src/core/solana/multiplier";

const wrappers = allListings().flatMap((l) =>
  l.wrappers.map((w) => ({ ticker: l.ticker, symbol: w.symbol, issuer: w.issuer, mint: w.mint })),
);

console.log(`  reading ${wrappers.length} mints...`);
const states = await fetchMultipliers(wrappers.map((w) => w.mint));

const rows = wrappers
  .flatMap((w) => {
    const state = states.get(w.mint);
    return state ? [{ ...w, ...state }] : [];
  })
  .sort((a, b) => Math.abs(b.naiveErrorBps) - Math.abs(a.naiveErrorBps));

const stale = rows.filter((r) => r.stale);
const rebasing = rows.filter((r) => r.effective !== 1);

console.log(`\n  resolved:  ${rows.length}/${wrappers.length}`);
console.log(`  rebasing:  ${rebasing.length} (multiplier != 1)`);
console.log(`  STALE:     ${stale.length} (stored field no longer matches reality)\n`);

if (stale.length > 0) {
  console.log(`  ${"SYMBOL".padEnd(10)}${"ISSUER".padEnd(9)}${"STORED".padStart(14)}${"EFFECTIVE".padStart(14)}${"NAIVE ERROR".padStart(14)}`);
  console.log(`  ${"-".repeat(59)}`);
  for (const r of stale.slice(0, 25)) {
    const err = Math.abs(r.naiveErrorBps) >= 1000
      ? `${(r.effective / r.stored).toFixed(1)}x`
      : `${r.naiveErrorBps.toFixed(1)} bp`;
    console.log(
      `  ${r.symbol.padEnd(10)}${r.issuer.padEnd(9)}${r.stored.toFixed(8).padStart(14)}${r.effective.toFixed(8).padStart(14)}${err.padStart(14)}`,
    );
  }
  if (stale.length > 25) console.log(`  ... and ${stale.length - 25} more`);
}

const byIssuer = new Map<string, number>();
for (const r of stale) byIssuer.set(r.issuer, (byIssuer.get(r.issuer) ?? 0) + 1);
console.log(`\n  stale by issuer: ${[...byIssuer].map(([i, n]) => `${i}=${n}`).join(", ") || "none"}`);
