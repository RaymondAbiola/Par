import { buildWrappers, spreadBps, type TickerPar } from "@/core/par/engine";
import { getOnchainPrices } from "@/core/prices/onchain";
import { getReferencePrices } from "@/core/prices/reference";
import { fetchMultipliers } from "@/core/solana/multiplier";
import { multiIssuerListings } from "@/core/registry";
import type { EquityListing } from "@/core/types";

export interface ScanOptions {
  /** How many tickers to return. */
  maxTickers?: number;
  /** How many get a live Finnhub quote; the rest fall back to Ondo's implied price. */
  maxLiveQuotes?: number;
  /** Skip tickers where no wrapper holds at least this much liquidity. */
  minLiquidityUsd?: number;
}

function deepestLiquidity(listing: EquityListing, spots: Awaited<ReturnType<typeof getOnchainPrices>>): number {
  return listing.wrappers.reduce((max, w) => Math.max(max, spots.get(w.mint)?.liquidityUsd ?? 0), 0);
}

/**
 * Ranks cross-issuer dislocations. On-chain prices come first and cheaply for everything, which is
 * what tells us where to spend the scarce live-quote budget.
 */
export async function scanDislocations(options: ScanOptions = {}): Promise<TickerPar[]> {
  const { maxTickers = 40, maxLiveQuotes = 40, minLiquidityUsd = 25_000 } = options;

  const listings = multiIssuerListings();
  const spots = await getOnchainPrices(listings.flatMap((l) => l.wrappers.map((w) => w.mint)));

  const ranked = listings
    .map((listing) => ({ listing, liquidity: deepestLiquidity(listing, spots) }))
    .filter((x) => x.liquidity >= minLiquidityUsd)
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, maxTickers)
    .map((x) => x.listing);

  const mints = ranked.flatMap((l) => l.wrappers.map((w) => w.mint));
  const [references, multipliers] = await Promise.all([
    getReferencePrices(ranked.map((l) => l.ticker), { maxLiveQuotes }),
    fetchMultipliers(mints),
  ]);

  const results: TickerPar[] = [];
  for (const listing of ranked) {
    const reference = references.get(listing.ticker);
    const wrappers = await buildWrappers(listing, reference, spots, multipliers, {});
    results.push({
      ticker: listing.ticker,
      name: listing.name,
      instrument: listing.instrument,
      reference: reference ?? null,
      wrappers,
      spreadBps: spreadBps(wrappers),
    });
  }

  return results.sort((a, b) => (b.spreadBps ?? -1) - (a.spreadBps ?? -1));
}
