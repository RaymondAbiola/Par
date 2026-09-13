import { createRateLimiter, fetchJson } from "@/core/http";

const SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";

// lite-api allows roughly 60 requests a minute; discovery walks hundreds of tickers
const throttle = createRateLimiter(1_100);

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
  await throttle();
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
