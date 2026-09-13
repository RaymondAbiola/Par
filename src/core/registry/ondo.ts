import { fetchJson } from "@/core/http";
import type { InstrumentType } from "@/core/types";

const CATALOG_URL = "https://app.ondo.finance/api/v2/assets";

interface RawTag {
  categorySlug?: string;
  tagSlug?: string;
}

interface RawAsset {
  symbol?: string;
  ticker?: string;
  assetName?: string;
  tags?: RawTag[];
  isTradingPaused?: boolean;
  isOffhoursTradable?: boolean;
  primaryMarket?: { price?: string };
  assetTradingStatus?: {
    isAssetTradeable?: boolean;
    isMarketOpen?: boolean;
    currentSession?: string;
    nextMarketOpen?: string;
  };
}

export interface OndoAsset {
  symbol: string;
  ticker: string;
  name: string;
  instrument: InstrumentType;
  tradingPaused: boolean;
  offhoursTradable: boolean;
  /** Ondo's own primary-market price: what they mint and redeem at. */
  primaryPrice: number | null;
  session: string | null;
  nextMarketOpen: string | null;
}

function toInstrument(tags: RawTag[] | undefined): InstrumentType {
  const slugs = (tags ?? [])
    .filter((t) => t.categorySlug === "instrument-type")
    .map((t) => t.tagSlug);
  if (slugs.includes("stock")) return "stock";
  if (slugs.includes("etf")) return "etf";
  return "other";
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchOndoCatalog(): Promise<OndoAsset[]> {
  const data = await fetchJson<{ assets?: RawAsset[] }>(CATALOG_URL, { timeoutMs: 25_000 });

  return (data.assets ?? []).flatMap((asset) => {
    if (!asset.symbol || !asset.ticker) return [];
    return [
      {
        symbol: asset.symbol,
        ticker: asset.ticker.toUpperCase(),
        name: asset.assetName ?? asset.ticker,
        instrument: toInstrument(asset.tags),
        tradingPaused: asset.isTradingPaused ?? false,
        offhoursTradable: asset.isOffhoursTradable ?? false,
        primaryPrice: toNumber(asset.primaryMarket?.price),
        session: asset.assetTradingStatus?.currentSession ?? null,
        nextMarketOpen: asset.assetTradingStatus?.nextMarketOpen ?? null,
      },
    ];
  });
}
