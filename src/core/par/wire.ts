import type { TickerPar, WrapperPar } from "@/core/par/engine";
import type { RankedWrapper } from "@/core/par/normalize";
import type { ReferencePrice } from "@/core/prices/reference";

/** Public shapes. Kept separate from internals so the API can stay stable as the engine moves. */

export interface WireMultiplier {
  effective: number;
  stored: number;
  stale: boolean;
  naiveErrorBps: number;
  effectiveFrom: string | null;
}

export interface WireExecution {
  sizeUsd: number;
  side: "buy" | "sell";
  routable: boolean;
  slippageBps: number | null;
  allInBps: number | null;
  tradeableWithin50Bps: number;
}

export interface WireWrapper {
  mint: string;
  symbol: string;
  issuer: string;
  decimals: number;
  pricePerShare: number | null;
  premiumBps: number | null;
  premiumPct: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  multiplier: WireMultiplier | null;
  execution: WireExecution | null;
  rank?: number;
  recommendable?: boolean;
  excludedBecause?: string | null;
}

export interface WireReference {
  price: number;
  source: string;
  asOf: string;
  ageSeconds: number;
  session: string;
  live: boolean;
  basis: string;
}

export interface WireTicker {
  ticker: string;
  name: string;
  instrument: string;
  reference: WireReference | null;
  spreadBps: number | null;
  spreadPct: number | null;
  wrappers: WireWrapper[];
}

const round = (value: number | null, places = 4): number | null =>
  value === null || !Number.isFinite(value) ? null : Number(value.toFixed(places));

export function toWireReference(reference: ReferencePrice | null): WireReference | null {
  if (!reference) return null;
  return {
    price: round(reference.price, 4) ?? 0,
    source: reference.source,
    asOf: reference.asOf.toISOString(),
    ageSeconds: reference.ageSeconds,
    session: reference.session,
    live: reference.live,
    basis: reference.basis,
  };
}

export function toWireWrapper(wrapper: WrapperPar | RankedWrapper): WireWrapper {
  const ranked = "rank" in wrapper ? wrapper : null;

  return {
    mint: wrapper.mint,
    symbol: wrapper.symbol,
    issuer: wrapper.issuer,
    decimals: wrapper.decimals,
    pricePerShare: round(wrapper.pricePerShare, 6),
    premiumBps: round(wrapper.premiumBps, 2),
    premiumPct: round(wrapper.premiumBps === null ? null : wrapper.premiumBps / 100, 4),
    liquidityUsd: round(wrapper.liquidityUsd, 2),
    volume24hUsd: round(wrapper.volume24hUsd, 2),
    holders: wrapper.holders,
    multiplier: wrapper.multiplier
      ? {
          effective: wrapper.multiplier.effective,
          stored: wrapper.multiplier.stored,
          stale: wrapper.multiplier.stale,
          naiveErrorBps: round(wrapper.multiplier.naiveErrorBps, 2) ?? 0,
          effectiveFrom: wrapper.multiplier.effectiveFrom
            ? new Date(wrapper.multiplier.effectiveFrom * 1000).toISOString()
            : null,
        }
      : null,
    execution: wrapper.execution
      ? {
          sizeUsd: wrapper.execution.sizeUsd,
          side: wrapper.execution.side,
          routable: wrapper.execution.routable,
          slippageBps: round(wrapper.execution.slippageBps, 2),
          allInBps: round(wrapper.execution.allInBps, 2),
          tradeableWithin50Bps: wrapper.execution.tradeableWithin50Bps,
        }
      : null,
    ...(ranked
      ? { rank: ranked.rank, recommendable: ranked.recommendable, excludedBecause: ranked.excludedBecause }
      : {}),
  };
}

export function toWireTicker(par: TickerPar, wrappers?: RankedWrapper[]): WireTicker {
  return {
    ticker: par.ticker,
    name: par.name,
    instrument: par.instrument,
    reference: toWireReference(par.reference),
    spreadBps: round(par.spreadBps, 2),
    spreadPct: round(par.spreadBps === null ? null : par.spreadBps / 100, 4),
    wrappers: (wrappers ?? par.wrappers).map(toWireWrapper),
  };
}
