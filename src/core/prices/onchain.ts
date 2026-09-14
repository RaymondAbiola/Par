import { TtlCache } from "@/core/cache";
import { fetchTokensByMints } from "@/core/registry/jupiter";

export interface OnchainPrice {
  mint: string;
  /**
   * USD per share-equivalent. Jupiter's price feed already applies the scaled UI multiplier,
   * so this is directly comparable to the underlying share price. Swap quotes are not.
   */
  pricePerShare: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
}

const cache = new TtlCache<Map<string, OnchainPrice>>(60_000);

export async function getOnchainPrices(
  mints: readonly string[],
): Promise<Map<string, OnchainPrice>> {
  const key = [...mints].sort().join(",");

  return cache.wrap(key, 60_000, async () => {
    const tokens = await fetchTokensByMints(mints);
    const out = new Map<string, OnchainPrice>();

    for (const token of tokens) {
      out.set(token.id, {
        mint: token.id,
        pricePerShare: token.usdPrice,
        liquidityUsd: token.liquidity,
        volume24hUsd: token.volume24h,
        holders: token.holderCount,
      });
    }

    return out;
  });
}
