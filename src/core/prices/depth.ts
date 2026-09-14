import { fetchJson } from "@/core/http";
import { JUPITER_LITE, jupiterThrottle, USDC_DECIMALS, USDC_MINT } from "@/core/jupiter";
import { rawToShares, sharesToRaw } from "@/core/solana/multiplier";

export type Side = "buy" | "sell";

export interface Rung {
  sizeUsd: number;
  side: Side;
  /** USD per share-equivalent actually achieved at this size. */
  effectivePricePerShare: number;
  /** Cost versus the reference price, in basis points. Positive is worse for the trader. */
  slippageBps: number;
  priceImpactPct: number | null;
}

export interface DepthProfile {
  mint: string;
  referencePricePerShare: number;
  rungs: Rung[];
  /** Sizes we asked for. A gap between this and rungs means no route existed, not a missing check. */
  attempted: number[];
  /** True when nothing on the ladder could be routed at all. */
  unroutable: boolean;
}

export const DEFAULT_LADDER = [1_000, 10_000, 50_000, 100_000] as const;

interface RawQuote {
  outAmount?: string;
  priceImpactPct?: string;
}

/**
 * Effective price from a quote. The quote API works in raw atomic units and ignores the scaled UI
 * multiplier, while prices are quoted per share, so the multiplier has to be reapplied by hand.
 */
export function effectiveBuyPrice(
  sizeUsd: number,
  outAmountRaw: bigint,
  decimals: number,
  multiplier: number,
): number | null {
  const shares = rawToShares(outAmountRaw, decimals, multiplier);
  return shares > 0 ? sizeUsd / shares : null;
}

export function effectiveSellPrice(shares: number, outAmountUsdcRaw: bigint): number | null {
  const usd = Number(outAmountUsdcRaw) / 10 ** USDC_DECIMALS;
  return shares > 0 ? usd / shares : null;
}

/** Signed so that positive always means the trader did worse than the reference. */
export function slippageBps(effective: number, reference: number, side: Side): number {
  if (reference <= 0) return 0;
  const raw = (effective - reference) / reference;
  return (side === "buy" ? raw : -raw) * 10_000;
}

async function quote(params: Record<string, string>): Promise<RawQuote> {
  await jupiterThrottle();
  const query = new URLSearchParams({ slippageBps: "300", ...params });
  return fetchJson<RawQuote>(`${JUPITER_LITE}/swap/v1/quote?${query}`);
}

async function rung(
  mint: string,
  decimals: number,
  multiplier: number,
  referencePricePerShare: number,
  sizeUsd: number,
  side: Side,
): Promise<Rung | null> {
  try {
    if (side === "buy") {
      const amount = BigInt(Math.round(sizeUsd * 10 ** USDC_DECIMALS));
      const raw = await quote({
        inputMint: USDC_MINT,
        outputMint: mint,
        amount: amount.toString(),
      });
      if (!raw.outAmount) return null;

      const effective = effectiveBuyPrice(sizeUsd, BigInt(raw.outAmount), decimals, multiplier);
      if (effective === null) return null;

      return {
        sizeUsd,
        side,
        effectivePricePerShare: effective,
        slippageBps: slippageBps(effective, referencePricePerShare, side),
        priceImpactPct: raw.priceImpactPct ? Number(raw.priceImpactPct) * 100 : null,
      };
    }

    const shares = sizeUsd / referencePricePerShare;
    const amount = sharesToRaw(shares, decimals, multiplier);
    if (amount <= 0n) return null;

    const raw = await quote({
      inputMint: mint,
      outputMint: USDC_MINT,
      amount: amount.toString(),
    });
    if (!raw.outAmount) return null;

    const effective = effectiveSellPrice(shares, BigInt(raw.outAmount));
    if (effective === null) return null;

    return {
      sizeUsd,
      side,
      effectivePricePerShare: effective,
      slippageBps: slippageBps(effective, referencePricePerShare, side),
      priceImpactPct: raw.priceImpactPct ? Number(raw.priceImpactPct) * 100 : null,
    };
  } catch {
    // an unroutable size is information, not an error: it means there is no depth there
    return null;
  }
}

export async function getDepthProfile(
  mint: string,
  decimals: number,
  multiplier: number,
  referencePricePerShare: number,
  ladder: readonly number[] = DEFAULT_LADDER,
  sides: readonly Side[] = ["buy", "sell"],
): Promise<DepthProfile> {
  const rungs: Rung[] = [];

  for (const side of sides) {
    for (const sizeUsd of ladder) {
      const result = await rung(mint, decimals, multiplier, referencePricePerShare, sizeUsd, side);
      if (result) rungs.push(result);
    }
  }

  return {
    mint,
    referencePricePerShare,
    rungs,
    attempted: [...ladder],
    unroutable: rungs.length === 0,
  };
}

/** Largest ladder size that still clears inside the slippage budget, per side. */
export function tradeableWithin(profile: DepthProfile, budgetBps: number, side: Side): number {
  return profile.rungs
    .filter((r) => r.side === side && r.slippageBps <= budgetBps)
    .reduce((max, r) => Math.max(max, r.sizeUsd), 0);
}
