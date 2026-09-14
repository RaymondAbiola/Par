import { TtlCache } from "@/core/cache";
import { fetchQuotes } from "@/core/prices/finnhub";
import { getSession, type MarketSession } from "@/core/prices/session";
import { fetchOndoCatalog } from "@/core/registry/ondo";

export type PriceSource = "finnhub" | "ondo-implied";

export interface ReferencePrice {
  ticker: string;
  /** The underlying share price everything else is measured against. */
  price: number;
  source: PriceSource;
  asOf: Date;
  ageSeconds: number;
  session: MarketSession;
  /** True only when the quote is from the session currently running. */
  live: boolean;
  /** What this price actually is, for honest labelling: "live" or e.g. "Fri 11 Sep close". */
  basis: string;
}

const cache = new TtlCache<Map<string, ReferencePrice>>(30_000);
const ondoCache = new TtlCache<Map<string, number>>(300_000);

const closeLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function describe(asOf: Date, live: boolean): string {
  return live ? "live" : `${closeLabel.format(asOf)} close`;
}

async function ondoImplied(): Promise<Map<string, number>> {
  return ondoCache.wrap("catalog", 300_000, async () => {
    const catalog = await fetchOndoCatalog();
    const out = new Map<string, number>();
    for (const asset of catalog) {
      if (asset.impliedSharePrice !== null) out.set(asset.ticker, asset.impliedSharePrice);
    }
    return out;
  });
}

export async function getReferencePrices(
  tickers: readonly string[],
): Promise<Map<string, ReferencePrice>> {
  const state = getSession();
  const now = Date.now();

  // when the market is shut the quote cannot move, so hold it far longer
  const ttl = state.live ? 30_000 : 300_000;
  const key = [...tickers].sort().join(",");

  return cache.wrap(key, ttl, async () => {
    const quotes = await fetchQuotes(tickers);
    const out = new Map<string, ReferencePrice>();

    for (const ticker of tickers) {
      const quote = quotes.get(ticker);
      if (!quote) continue;

      const ageSeconds = Math.max(0, Math.round((now - quote.asOf.getTime()) / 1000));
      const live = state.live && ageSeconds < 900;

      out.set(ticker, {
        ticker,
        price: quote.price,
        source: "finnhub",
        asOf: quote.asOf,
        ageSeconds,
        session: state.session,
        live,
        basis: describe(quote.asOf, live),
      });
    }

    const missing = tickers.filter((t) => !out.has(t));
    if (missing.length > 0) {
      const implied = await ondoImplied();
      for (const ticker of missing) {
        const price = implied.get(ticker);
        if (price === undefined) continue;

        out.set(ticker, {
          ticker,
          price,
          source: "ondo-implied",
          asOf: new Date(now),
          ageSeconds: 0,
          session: state.session,
          live: false,
          basis: "implied from market cap",
        });
      }
    }

    return out;
  });
}

export async function getReferencePrice(ticker: string): Promise<ReferencePrice | undefined> {
  return (await getReferencePrices([ticker])).get(ticker);
}
