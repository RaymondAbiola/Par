import {
  allInBps,
  getTickerPar,
  isRecommendable,
  LIQUIDITY_FLOOR_USD,
  rankWrappers,
  type TickerPar,
  type WrapperPar,
} from "@/core/par/engine";
import type { Side } from "@/core/prices/depth";

export type ExclusionReason = "no-price" | "unroutable" | "thin-liquidity";

export interface RankedWrapper extends WrapperPar {
  rank: number;
  recommendable: boolean;
  /** Why this wrapper is not worth using, so the interface can explain itself. */
  excludedBecause: ExclusionReason | null;
}

export function exclusionReason(
  wrapper: WrapperPar,
  floorUsd = LIQUIDITY_FLOOR_USD,
): ExclusionReason | null {
  if (wrapper.pricePerShare === null) return "no-price";
  if (wrapper.execution && !wrapper.execution.routable) return "unroutable";
  if (!isRecommendable(wrapper, floorUsd)) return "thin-liquidity";
  return null;
}

export function annotate(
  wrappers: readonly WrapperPar[],
  side: Side,
  floorUsd = LIQUIDITY_FLOOR_USD,
): RankedWrapper[] {
  return rankWrappers(wrappers, side, floorUsd).map((wrapper, index) => {
    const reason = exclusionReason(wrapper, floorUsd);
    return { ...wrapper, rank: index + 1, recommendable: reason === null, excludedBecause: reason };
  });
}

/** What choosing `chosen` over `alternative` is worth on a trade of this size, in dollars. */
export function savingUsd(
  chosen: WrapperPar,
  alternative: WrapperPar,
  sizeUsd: number,
  side: Side,
): number | null {
  const a = chosen.execution?.allInBps ?? allInBps(chosen.premiumBps, null, side);
  const b = alternative.execution?.allInBps ?? allInBps(alternative.premiumBps, null, side);
  if (a === null || b === null) return null;
  return ((b - a) / 10_000) * sizeUsd;
}

export interface VenueChoice {
  ticker: string;
  sizeUsd: number;
  side: Side;
  par: TickerPar;
  candidates: RankedWrapper[];
  best: RankedWrapper | null;
  /** Against the next best tradeable wrapper. Null when there is no alternative. */
  savingUsd: number | null;
  /** Against the worst tradeable wrapper. */
  maxSavingUsd: number | null;
}

export function chooseVenue(par: TickerPar, sizeUsd: number, side: Side): VenueChoice {
  const candidates = annotate(par.wrappers, side);
  const tradeable = candidates.filter((w) => w.recommendable);
  const best = tradeable[0] ?? null;

  const next = tradeable[1] ?? null;
  const worst = tradeable.length > 1 ? tradeable[tradeable.length - 1] : null;

  return {
    ticker: par.ticker,
    sizeUsd,
    side,
    par,
    candidates,
    best,
    savingUsd: best && next ? savingUsd(best, next, sizeUsd, side) : null,
    maxSavingUsd: best && worst ? savingUsd(best, worst, sizeUsd, side) : null,
  };
}

/** Measures real depth for every wrapper, then picks. Costs a Jupiter quote per wrapper. */
export async function getBestVenue(
  ticker: string,
  sizeUsd: number,
  side: Side = "buy",
): Promise<VenueChoice | null> {
  const par = await getTickerPar(ticker, { depth: { sizeUsd, side } });
  return par ? chooseVenue(par, sizeUsd, side) : null;
}
