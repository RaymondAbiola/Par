import { getDepthProfile, tradeableWithin, type Side } from "@/core/prices/depth";
import { getOnchainPrices } from "@/core/prices/onchain";
import { getReferencePrices, type ReferencePrice } from "@/core/prices/reference";
import { getListing, multiIssuerListings } from "@/core/registry";
import { fetchMultipliers, type MultiplierState } from "@/core/solana/multiplier";
import type { EquityListing, InstrumentType, Issuer } from "@/core/types";

export interface ExecutionSummary {
  sizeUsd: number;
  side: Side;
  routable: boolean;
  slippageBps: number | null;
  /** Premium plus slippage, signed so positive is always worse for the trader. */
  allInBps: number | null;
  /** Largest ladder size clearing inside 50bp. */
  tradeableWithin50Bps: number;
}

export interface WrapperPar {
  mint: string;
  symbol: string;
  issuer: Issuer;
  decimals: number;
  pricePerShare: number | null;
  /** Against the reference share price. Positive is a premium, negative a discount. */
  premiumBps: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  multiplier: MultiplierState | null;
  execution: ExecutionSummary | null;
}

export interface TickerPar {
  ticker: string;
  name: string;
  instrument: InstrumentType;
  reference: ReferencePrice | null;
  wrappers: WrapperPar[];
  /** Gap between the widest and tightest wrapper premium. The cross-issuer dislocation. */
  spreadBps: number | null;
}

/** Positive means the token trades above the real share. */
export function premiumBps(pricePerShare: number | null, reference: number | null): number | null {
  if (pricePerShare === null || reference === null || reference <= 0) return null;
  return ((pricePerShare - reference) / reference) * 10_000;
}

/**
 * A premium hurts a buyer and helps a seller, so it flips sign by side. Slippage is already
 * signed as a cost. Both together are what the trade actually costs against the real share.
 */
export function allInBps(premium: number | null, slippage: number | null, side: Side): number | null {
  if (premium === null) return null;
  const directional = side === "buy" ? premium : -premium;
  return directional + (slippage ?? 0);
}

export function spreadBps(wrappers: readonly WrapperPar[]): number | null {
  const values = wrappers.flatMap((w) => (w.premiumBps === null ? [] : [w.premiumBps]));
  if (values.length < 2) return null;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Liquidity below this is treated as untradeable when we have not measured depth. Calibrated
 * against mainnet: AMDx holds about $12.7k and still slipped 14% on a $1,000 buy.
 */
export const LIQUIDITY_FLOOR_USD = 50_000;

/**
 * Whether a wrapper is worth recommending. Measured depth is authoritative; the liquidity floor
 * is only a stand-in for the cheap path, where quoting every wrapper would be too expensive.
 */
export function isRecommendable(wrapper: WrapperPar, floorUsd = LIQUIDITY_FLOOR_USD): boolean {
  if (wrapper.execution) return wrapper.execution.routable;
  return (wrapper.liquidityUsd ?? 0) >= floorUsd;
}

/**
 * Cheapest wrapper first. Anything untradeable sorts last regardless of headline price: a token
 * you cannot trade is not a better deal than one you can.
 */
export function rankWrappers(
  wrappers: readonly WrapperPar[],
  side: Side,
  floorUsd = LIQUIDITY_FLOOR_USD,
): WrapperPar[] {
  return [...wrappers].sort((a, b) => {
    const aRoutable = isRecommendable(a, floorUsd);
    const bRoutable = isRecommendable(b, floorUsd);
    if (aRoutable !== bRoutable) return aRoutable ? -1 : 1;

    const aCost = a.execution?.allInBps ?? allInBps(a.premiumBps, null, side);
    const bCost = b.execution?.allInBps ?? allInBps(b.premiumBps, null, side);
    if (aCost === null) return 1;
    if (bCost === null) return -1;
    return aCost - bCost;
  });
}

export interface ParOptions {
  /** Measure real execution cost. Costs several Jupiter quotes per wrapper, so opt in. */
  depth?: { sizeUsd: number; side: Side };
}

type SpotMap = Awaited<ReturnType<typeof getOnchainPrices>>;
type MultiplierMap = Awaited<ReturnType<typeof fetchMultipliers>>;

async function loadMarketData(mints: readonly string[]): Promise<[SpotMap, MultiplierMap]> {
  return Promise.all([getOnchainPrices(mints), fetchMultipliers(mints)]);
}

async function buildWrappers(
  listing: EquityListing,
  reference: ReferencePrice | undefined,
  spots: SpotMap,
  multipliers: MultiplierMap,
  options: ParOptions,
): Promise<WrapperPar[]> {
  const wrappers: WrapperPar[] = [];

  for (const wrapper of listing.wrappers) {
    const spot = spots.get(wrapper.mint);
    const multiplier = multipliers.get(wrapper.mint) ?? null;
    const price = spot?.pricePerShare ?? null;
    const premium = premiumBps(price, reference?.price ?? null);

    let execution: ExecutionSummary | null = null;
    if (options.depth && price !== null && multiplier) {
      const { sizeUsd, side } = options.depth;
      const profile = await getDepthProfile(
        wrapper.mint,
        wrapper.decimals,
        multiplier.effective,
        price,
        [sizeUsd],
        [side],
      );
      const rung = profile.rungs[0] ?? null;

      execution = {
        sizeUsd,
        side,
        routable: rung !== null,
        slippageBps: rung?.slippageBps ?? null,
        allInBps: rung ? allInBps(premium, rung.slippageBps, side) : null,
        tradeableWithin50Bps: tradeableWithin(profile, 50, side),
      };
    }

    wrappers.push({
      mint: wrapper.mint,
      symbol: wrapper.symbol,
      issuer: wrapper.issuer,
      decimals: wrapper.decimals,
      pricePerShare: price,
      premiumBps: premium,
      liquidityUsd: spot?.liquidityUsd ?? null,
      volume24hUsd: spot?.volume24hUsd ?? null,
      holders: spot?.holders ?? null,
      multiplier,
      execution,
    });
  }

  return wrappers;
}

export async function getTickerPar(
  ticker: string,
  options: ParOptions = {},
): Promise<TickerPar | null> {
  const listing = getListing(ticker);
  if (!listing) return null;

  const mints = listing.wrappers.map((w) => w.mint);
  const [reference, [spots, multipliers]] = await Promise.all([
    getReferencePrices([listing.ticker]).then((m) => m.get(listing.ticker)),
    loadMarketData(mints),
  ]);
  const wrappers = await buildWrappers(listing, reference, spots, multipliers, options);

  return {
    ticker: listing.ticker,
    name: listing.name,
    instrument: listing.instrument,
    reference: reference ?? null,
    wrappers,
    spreadBps: spreadBps(wrappers),
  };
}

export async function getParSnapshot(tickers: readonly string[]): Promise<TickerPar[]> {
  const listings = tickers.flatMap((t) => getListing(t) ?? []);
  const allMints = listings.flatMap((l) => l.wrappers.map((w) => w.mint));

  // one batched pass for every mint, rather than a round trip per ticker
  const [references, [spots, multipliers]] = await Promise.all([
    getReferencePrices(listings.map((l) => l.ticker)),
    loadMarketData(allMints),
  ]);

  const results: TickerPar[] = [];
  for (const listing of listings) {
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
  return results;
}

/** Tickers with more than one wrapper, where a cross-issuer comparison actually exists. */
export function comparableTickers(): string[] {
  return multiIssuerListings().map((l) => l.ticker);
}
