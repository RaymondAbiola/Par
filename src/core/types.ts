export type Issuer = "xstocks" | "ondo" | "backpack";

export type InstrumentType = "stock" | "etf" | "other";

export interface Wrapper {
  mint: string;
  /** Wrapper-specific symbol, e.g. NVDAx or NVDAon. */
  symbol: string;
  issuer: Issuer;
  decimals: number;
}

export interface EquityListing {
  /** Underlying ticker, e.g. NVDA. */
  ticker: string;
  name: string;
  instrument: InstrumentType;
  wrappers: Wrapper[];
}

export interface Registry {
  generatedAt: string;
  listings: EquityListing[];
}

export const ISSUER_LABEL: Record<Issuer, string> = {
  xstocks: "xStocks",
  ondo: "Ondo",
  backpack: "Backpack",
};
