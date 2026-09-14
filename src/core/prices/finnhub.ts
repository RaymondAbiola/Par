import { createRateLimiter, fetchJson, mapPool } from "@/core/http";
import { requireEnv } from "@/env";

// free tier is 60 calls a minute
const throttle = createRateLimiter(1_050);

export interface FinnhubQuote {
  ticker: string;
  /** Last regular-session price. The free tier does not update this outside regular hours. */
  price: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  asOf: Date;
}

interface RawQuote {
  c?: number;
  pc?: number;
  o?: number;
  h?: number;
  l?: number;
  t?: number;
}

export async function fetchQuote(ticker: string): Promise<FinnhubQuote | null> {
  await throttle();

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${requireEnv("FINNHUB_API_KEY")}`;
  const raw = await fetchJson<RawQuote>(url);

  // finnhub answers 200 with a zeroed body for symbols it does not cover
  if (!raw.c || !raw.t) return null;

  return {
    ticker,
    price: raw.c,
    previousClose: raw.pc ?? raw.c,
    open: raw.o ?? raw.c,
    high: raw.h ?? raw.c,
    low: raw.l ?? raw.c,
    asOf: new Date(raw.t * 1000),
  };
}

export async function fetchQuotes(tickers: readonly string[]): Promise<Map<string, FinnhubQuote>> {
  const results = await mapPool(tickers, 4, async (ticker) => {
    try {
      return await fetchQuote(ticker);
    } catch {
      return null;
    }
  });

  const out = new Map<string, FinnhubQuote>();
  for (const quote of results) if (quote) out.set(quote.ticker, quote);
  return out;
}
