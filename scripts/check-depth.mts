import { getDepthProfile, tradeableWithin } from "../src/core/prices/depth";
import { getOnchainPrices } from "../src/core/prices/onchain";
import { getReferencePrices } from "../src/core/prices/reference";
import { getSession } from "../src/core/prices/session";
import { getListing } from "../src/core/registry/index";
import { fetchMultipliers } from "../src/core/solana/multiplier";

const TICKERS = process.argv.slice(2).length ? process.argv.slice(2) : ["NVDA", "AMD"];
const LADDER = [1_000, 10_000, 50_000];

const state = getSession();
console.log(`\n  ${state.eastern}  session=${state.session}\n`);

const listings = TICKERS.flatMap((t) => getListing(t) ?? []);
const mints = listings.flatMap((l) => l.wrappers.map((w) => w.mint));

const [refs, spots, mults] = await Promise.all([
  getReferencePrices(TICKERS),
  getOnchainPrices(mints),
  fetchMultipliers(mints),
]);

for (const listing of listings) {
  const ref = refs.get(listing.ticker);
  if (!ref) continue;
  console.log(`  ${listing.ticker}  share ${ref.price.toFixed(2)}  (${ref.basis})`);

  for (const wrapper of listing.wrappers) {
    const spot = spots.get(wrapper.mint);
    const mult = mults.get(wrapper.mint);
    if (!spot?.pricePerShare || !mult) continue;

    const premium = ((spot.pricePerShare - ref.price) / ref.price) * 100;
    console.log(
      `    ${wrapper.symbol.padEnd(9)}${spot.pricePerShare.toFixed(2).padStart(9)}  ` +
        `prem ${premium >= 0 ? "+" : ""}${premium.toFixed(2)}%  ` +
        `mult ${mult.effective.toFixed(6)}${mult.stale ? " STALE" : ""}  ` +
        `liq $${Math.round(spot.liquidityUsd ?? 0).toLocaleString()}  ` +
        `vol24h $${Math.round(spot.volume24hUsd ?? 0).toLocaleString()}`,
    );

    const profile = await getDepthProfile(
      wrapper.mint,
      wrapper.decimals,
      mult.effective,
      spot.pricePerShare,
      LADDER,
    );

    for (const side of ["buy", "sell"] as const) {
      const cells = LADDER.map((size) => {
        const r = profile.rungs.find((x) => x.side === side && x.sizeUsd === size);
        return r ? `${(size / 1000).toFixed(0)}k:${r.slippageBps.toFixed(0)}bp` : `${(size / 1000).toFixed(0)}k:--`;
      });
      console.log(`      ${side.padEnd(5)}${cells.join("   ")}   within 50bp: $${tradeableWithin(profile, 50, side).toLocaleString()}`);
    }
  }
  console.log();
}
