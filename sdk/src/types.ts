export type Issuer = "xstocks" | "ondo";
export type Side = "buy" | "sell";
export type MarketSession =
  | "regular"
  | "premarket"
  | "afterhours"
  | "overnight"
  | "weekend"
  | "holiday";

export interface ResponseMeta {
  generatedAt: string;
  session: MarketSession;
  marketLive: boolean;
  eastern: string;
}

export interface Envelope<T> {
  data: T;
  meta: ResponseMeta;
}

export interface Multiplier {
  effective: number;
  stored: number;
  stale: boolean;
  naiveErrorBps: number;
  effectiveFrom: string | null;
}

export interface Execution {
  sizeUsd: number;
  side: Side;
  routable: boolean;
  slippageBps: number | null;
  allInBps: number | null;
  tradeableWithin50Bps: number;
}

export interface Wrapper {
  mint: string;
  symbol: string;
  issuer: Issuer;
  decimals: number;
  pricePerShare: number | null;
  premiumBps: number | null;
  premiumPct: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  multiplier: Multiplier | null;
  execution: Execution | null;
  rank?: number;
  recommendable?: boolean;
  excludedBecause?: "no-price" | "unroutable" | "thin-liquidity" | null;
}

export interface Reference {
  price: number;
  source: "finnhub" | "ondo-implied";
  asOf: string;
  ageSeconds: number;
  session: MarketSession;
  /** False outside the regular session: the price is then a prior close, per `basis`. */
  live: boolean;
  basis: string;
}

export interface Ticker {
  ticker: string;
  name: string;
  instrument: "stock" | "etf" | "other";
  reference: Reference | null;
  spreadBps: number | null;
  spreadPct: number | null;
  wrappers: Wrapper[];
}

export interface Decision {
  sizeUsd: number;
  side: Side;
  best: string | null;
  savingUsd: number | null;
  maxSavingUsd: number | null;
}

export interface TickerWithDecision extends Ticker {
  decision: Decision;
}

export interface StaleRow {
  ticker: string;
  symbol: string;
  issuer: Issuer;
  mint: string;
  stored: number;
  effective: number;
  stale: boolean;
  naiveErrorBps: number;
  naiveErrorFactor: number | null;
  effectiveFrom: string | null;
}

export interface MultiplierReport {
  scanned: number;
  stale: number;
  rebasing: number;
  rows: StaleRow[];
}

export interface Position {
  mint: string;
  symbol: string;
  ticker: string;
  issuer: Issuer;
  rawAmount: string;
  shares: number;
  naiveShares: number;
  storedFieldShares: number;
  sharePrice: number | null;
  value: number | null;
  naiveValue: number | null;
  multiplier: { effective: number; stored: number; stale: boolean };
}

export interface Portfolio {
  owner: string;
  basis: string | null;
  totalValue: number;
  naiveTotal: number;
  storedFieldTotal: number;
  positions: Position[];
}

export interface Health {
  status: string;
  listings: number;
  wrappers: number;
  registryGeneratedAt: string;
}
