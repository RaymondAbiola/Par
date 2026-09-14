import { sql } from "@/core/db/client";
import type { TickerPar } from "@/core/par/engine";
import { getSession } from "@/core/prices/session";

export interface SnapshotRow {
  ticker: string;
  mint: string;
  symbol: string;
  issuer: string;
  pricePerShare: number | null;
  premiumBps: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  multiplier: number | null;
  multiplierStale: boolean | null;
  referencePrice: number | null;
  referenceSource: string | null;
  referenceAsOf: string | null;
}

export function toSnapshotRows(results: readonly TickerPar[]): SnapshotRow[] {
  return results.flatMap((par) =>
    par.wrappers.map((w) => ({
      ticker: par.ticker,
      mint: w.mint,
      symbol: w.symbol,
      issuer: w.issuer,
      pricePerShare: w.pricePerShare,
      premiumBps: w.premiumBps,
      liquidityUsd: w.liquidityUsd,
      volume24hUsd: w.volume24hUsd,
      multiplier: w.multiplier?.effective ?? null,
      multiplierStale: w.multiplier?.stale ?? null,
      referencePrice: par.reference?.price ?? null,
      referenceSource: par.reference?.source ?? null,
      referenceAsOf: par.reference?.asOf.toISOString() ?? null,
    })),
  );
}

/** Writes one run as a single statement; unnest keeps it to one round trip. */
export async function insertSnapshot(rows: readonly SnapshotRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const state = getSession();
  const capturedAt = new Date().toISOString();
  const db = sql();

  await db.query(
    `insert into premium_snapshots (
       captured_at, ticker, mint, symbol, issuer, session, market_live,
       reference_price, reference_source, reference_as_of,
       price_per_share, premium_bps, liquidity_usd, volume_24h_usd,
       multiplier, multiplier_stale
     )
     select $1::timestamptz, t.ticker, t.mint, t.symbol, t.issuer, $2::text, $3::boolean,
            t.reference_price, t.reference_source, t.reference_as_of,
            t.price_per_share, t.premium_bps, t.liquidity_usd, t.volume_24h_usd,
            t.multiplier, t.multiplier_stale
       from unnest(
         $4::text[], $5::text[], $6::text[], $7::text[],
         $8::numeric[], $9::text[], $10::timestamptz[],
         $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[],
         $15::numeric[], $16::boolean[]
       ) as t(mint, symbol, issuer, ticker,
              reference_price, reference_source, reference_as_of,
              price_per_share, premium_bps, liquidity_usd, volume_24h_usd,
              multiplier, multiplier_stale)`,
    [
      capturedAt,
      state.session,
      state.live,
      rows.map((r) => r.mint),
      rows.map((r) => r.symbol),
      rows.map((r) => r.issuer),
      rows.map((r) => r.ticker),
      rows.map((r) => r.referencePrice),
      rows.map((r) => r.referenceSource),
      rows.map((r) => r.referenceAsOf),
      rows.map((r) => r.pricePerShare),
      rows.map((r) => r.premiumBps),
      rows.map((r) => r.liquidityUsd),
      rows.map((r) => r.volume24hUsd),
      rows.map((r) => r.multiplier),
      rows.map((r) => r.multiplierStale),
    ],
  );

  return rows.length;
}

export interface SpreadPoint {
  capturedAt: string;
  session: string;
  marketLive: boolean;
  spreadBps: number;
}

/** Cross-issuer spread over time for one ticker, derived from the per-wrapper rows. */
export async function getSpreadSeries(ticker: string, hours = 168): Promise<SpreadPoint[]> {
  const rows = await sql().query(
    `select captured_at, session, market_live,
            max(premium_bps) - min(premium_bps) as spread_bps
       from premium_snapshots
      where ticker = $1
        and captured_at > now() - ($2 || ' hours')::interval
        and premium_bps is not null
      group by captured_at, session, market_live
     having count(*) > 1
      order by captured_at`,
    [ticker.toUpperCase(), String(hours)],
  );

  return (rows as Record<string, unknown>[]).map((r) => ({
    capturedAt: new Date(r.captured_at as string).toISOString(),
    session: String(r.session),
    marketLive: Boolean(r.market_live),
    spreadBps: Number(r.spread_bps),
  }));
}

export interface SessionStat {
  session: string;
  samples: number;
  medianSpreadBps: number;
  meanAbsPremiumBps: number;
}

/** The point of the whole history: does the dislocation widen when the market is shut? */
export async function getSessionStats(hours = 168): Promise<SessionStat[]> {
  const rows = await sql().query(
    `with spreads as (
        select session, ticker, captured_at,
               max(premium_bps) - min(premium_bps) as spread_bps,
               avg(abs(premium_bps)) as abs_premium_bps
          from premium_snapshots
         where captured_at > now() - ($1 || ' hours')::interval
           and premium_bps is not null
         group by session, ticker, captured_at
        having count(*) > 1
     )
     select session,
            count(*) as samples,
            percentile_cont(0.5) within group (order by spread_bps) as median_spread_bps,
            avg(abs_premium_bps) as mean_abs_premium_bps
       from spreads
      group by session
      order by median_spread_bps desc`,
    [String(hours)],
  );

  return (rows as Record<string, unknown>[]).map((r) => ({
    session: String(r.session),
    samples: Number(r.samples),
    medianSpreadBps: Number(r.median_spread_bps),
    meanAbsPremiumBps: Number(r.mean_abs_premium_bps),
  }));
}

export async function getCoverage(): Promise<{ rows: number; runs: number; since: string | null }> {
  const result = await sql().query(
    `select count(*)::int as rows,
            count(distinct captured_at)::int as runs,
            min(captured_at) as since
       from premium_snapshots`,
  );
  const row = (result as Record<string, unknown>[])[0];

  return {
    rows: Number(row?.rows ?? 0),
    runs: Number(row?.runs ?? 0),
    since: row?.since ? new Date(row.since as string).toISOString() : null,
  };
}

/** Tickers that actually have history, most-sampled first. */
export async function getTrackedTickers(limit = 24): Promise<string[]> {
  const rows = await sql().query(
    `select ticker, count(*)::int as n
       from premium_snapshots
      where premium_bps is not null
      group by ticker
      order by n desc, ticker
      limit $1`,
    [limit],
  );
  return (rows as Record<string, unknown>[]).map((r) => String(r.ticker));
}
