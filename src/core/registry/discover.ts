import { mapPool } from "@/core/http";
import { searchTokens, type JupiterToken } from "@/core/registry/jupiter";
import { fetchOndoCatalog, type OndoAsset } from "@/core/registry/ondo";
import type { EquityListing, Issuer, Registry, Wrapper } from "@/core/types";

// both issuers use vanity mints, which is a sturdier signal than tags or names alone
const XSTOCKS_MINT_PREFIX = "Xs";
const ONDO_MINT_SUFFIX = "ondo";

function classify(token: JupiterToken, ticker: string): Issuer | null {
  const symbol = token.symbol.toUpperCase();

  const looksXstocks = token.tags.includes("xstocks") || token.id.startsWith(XSTOCKS_MINT_PREFIX);
  if (looksXstocks && symbol === `${ticker}X`) return "xstocks";

  const looksOndo = token.name.includes("Ondo Tokenized") || token.id.endsWith(ONDO_MINT_SUFFIX);
  if (looksOndo && symbol === `${ticker}ON`) return "ondo";

  return null;
}

function toWrapper(token: JupiterToken, issuer: Issuer): Wrapper {
  return { mint: token.id, symbol: token.symbol, issuer, decimals: token.decimals };
}

function toListing(asset: OndoAsset, tokens: JupiterToken[]): EquityListing | null {
  const wrappers = tokens.flatMap((token) => {
    const issuer = classify(token, asset.ticker);
    return issuer ? [toWrapper(token, issuer)] : [];
  });
  if (wrappers.length === 0) return null;

  return {
    ticker: asset.ticker,
    name: asset.name,
    instrument: asset.instrument,
    wrappers: wrappers.sort((a, b) => a.issuer.localeCompare(b.issuer)),
  };
}

export interface DiscoveryOptions {
  concurrency?: number;
  onProgress?: (done: number, total: number, phase: string) => void;
}

export interface DiscoveryResult {
  registry: Registry;
  /** Tickers whose lookup errored outright. A non-empty list means the snapshot is incomplete. */
  failures: string[];
}

export async function discoverRegistry(options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const { concurrency = 3, onProgress } = options;

  const catalog = await fetchOndoCatalog();
  const universe = catalog.filter((a) => a.instrument === "stock" || a.instrument === "etf");

  const listings: EquityListing[] = [];

  async function pass(assets: OndoAsset[], phase: string): Promise<OndoAsset[]> {
    let done = 0;
    const failed: OndoAsset[] = [];

    await mapPool(assets, concurrency, async (asset) => {
      try {
        const listing = toListing(asset, await searchTokens(asset.ticker));
        if (listing) listings.push(listing);
      } catch {
        failed.push(asset);
      }
      onProgress?.(++done, assets.length, phase);
    });

    return failed;
  }

  const failedOnce = await pass(universe, "discover");
  const failedTwice = failedOnce.length > 0 ? await pass(failedOnce, "retry") : [];

  listings.sort((a, b) => a.ticker.localeCompare(b.ticker));

  return {
    registry: { generatedAt: new Date().toISOString(), listings },
    failures: failedTwice.map((a) => a.ticker),
  };
}

export const __test = { classify, toListing };
