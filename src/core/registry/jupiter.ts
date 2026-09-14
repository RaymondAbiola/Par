import { fetchJson } from "@/core/http";
import { JUPITER_LITE, jupiterThrottle } from "@/core/jupiter";

const SEARCH_URL = `${JUPITER_LITE}/tokens/v2/search`;

export interface JupiterToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  tags: string[];
  usdPrice: number | null;
  liquidity: number | null;
  holderCount: number | null;
  volume24h: number | null;
}

interface RawToken {
  id?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  tags?: string[];
  usdPrice?: number;
  liquidity?: number;
  holderCount?: number;
  stats24h?: { buyVolume?: number; sellVolume?: number };
}

function normalize(raw: RawToken): JupiterToken | null {
  if (!raw.id || !raw.symbol || raw.decimals === undefined) return null;
  const stats = raw.stats24h;
  const volume =
    stats === undefined ? null : (stats.buyVolume ?? 0) + (stats.sellVolume ?? 0);

  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name ?? raw.symbol,
    decimals: raw.decimals,
    tags: raw.tags ?? [],
    usdPrice: raw.usdPrice ?? null,
    liquidity: raw.liquidity ?? null,
    holderCount: raw.holderCount ?? null,
    volume24h: volume,
  };
}

export async function searchTokens(query: string): Promise<JupiterToken[]> {
  await jupiterThrottle();
  const raw = await fetchJson<RawToken[]>(`${SEARCH_URL}?query=${encodeURIComponent(query)}`);
  return Array.isArray(raw) ? raw.flatMap((t) => normalize(t) ?? []) : [];
}

/** Search accepts comma-separated mints but not comma-separated symbols, hence the split paths. */
export async function fetchTokensByMints(mints: readonly string[]): Promise<JupiterToken[]> {
  const batches: string[][] = [];
  for (let i = 0; i < mints.length; i += 50) batches.push([...mints.slice(i, i + 50)]);

  const results = await Promise.all(batches.map((batch) => searchTokens(batch.join(","))));
  return results.flat();
}
