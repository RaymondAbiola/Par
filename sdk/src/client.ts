import type {
  Envelope,
  Health,
  MultiplierReport,
  Portfolio,
  Side,
  Ticker,
  TickerWithDecision,
  Wrapper,
} from "./types.js";

export class ParError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ParError";
  }
}

export interface ParOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

const DEFAULT_BASE = "https://par-sigma.vercel.app";

export class Par {
  private readonly baseUrl: string;
  private readonly doFetch: typeof globalThis.fetch;

  constructor(options: ParOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.doFetch = options.fetch ?? globalThis.fetch;
  }

  private async get<T>(path: string, params: Record<string, string | number | undefined> = {}) {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await this.doFetch(url.toString(), { headers: { accept: "application/json" } });
    const body = (await response.json()) as Envelope<T> | { error?: { code: string; message: string } };

    if (!response.ok || !("data" in body)) {
      const error = "error" in body ? body.error : undefined;
      throw new ParError(response.status, error?.code ?? "unknown", error?.message ?? "Request failed");
    }
    return body as Envelope<T>;
  }

  /** Cross-issuer dislocations, widest first. */
  async tickers(options: { limit?: number; minLiquidity?: number; tickers?: string[] } = {}) {
    return this.get<Ticker[]>("/tickers", {
      limit: options.limit,
      minLiquidity: options.minLiquidity,
      tickers: options.tickers?.join(","),
    });
  }

  /** One underlying across every wrapper. Without a size, headline prices only. */
  async ticker(symbol: string) {
    return this.get<Ticker>(`/ticker/${encodeURIComponent(symbol)}`);
  }

  /**
   * Routes a real quote at this size through every wrapper and picks one. Costs a quote
   * per wrapper upstream, so it is slower than `ticker`.
   */
  async bestVenue(symbol: string, sizeUsd: number, side: Side = "buy") {
    return this.get<TickerWithDecision>(`/ticker/${encodeURIComponent(symbol)}`, {
      size: sizeUsd,
      side,
    });
  }

  async token(mint: string) {
    return this.get<Wrapper & { underlying: Omit<Ticker, "wrappers"> }>(`/token/${encodeURIComponent(mint)}`);
  }

  /** Every wrapper whose stored scaled-UI multiplier no longer matches the live one. */
  async multipliers(options: { limit?: number; staleOnly?: boolean } = {}) {
    return this.get<MultiplierReport>("/multipliers", {
      limit: options.limit,
      staleOnly: options.staleOnly === false ? "false" : undefined,
    });
  }

  /** Values every tokenized equity a wallet holds, correctly and naively. */
  async portfolio(owner: string) {
    return this.get<Portfolio>(`/portfolio/${encodeURIComponent(owner)}`);
  }

  async health() {
    return this.get<Health>("/health");
  }
}
