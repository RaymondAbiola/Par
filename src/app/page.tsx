import { annotate } from "@/core/par/normalize";
import { scanDislocations } from "@/core/par/scan";
import { toWireTicker, type WireTicker } from "@/core/par/wire";
import { allListings, allMints } from "@/core/registry";
import { fetchMultipliers } from "@/core/solana/multiplier";
import { MonitorTable } from "@/components/monitor/monitor-table";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat, StatRow } from "@/components/ui/stat";

// statically generated then refreshed in the background: a cold scan is far too slow to block a request
export const revalidate = 300;

interface Snapshot {
  tickers: WireTicker[];
  staleCount: number;
  rebasingCount: number;
  basis: string | null;
  failed: boolean;
}

async function load(): Promise<Snapshot> {
  try {
    const [results, multipliers] = await Promise.all([
      scanDislocations({ maxTickers: 60, maxLiveQuotes: 30, minLiquidityUsd: 25_000 }),
      fetchMultipliers(allMints()),
    ]);

    const states = [...multipliers.values()];
    return {
      tickers: results.map((par) => toWireTicker(par, annotate(par.wrappers, "buy"))),
      staleCount: states.filter((s) => s.stale).length,
      rebasingCount: states.filter((s) => s.effective !== 1).length,
      basis: results.find((r) => r.reference)?.reference?.basis ?? null,
      failed: false,
    };
  } catch {
    // never fail the build over a rate-limited upstream; show the page with what we know statically
    return { tickers: [], staleCount: 0, rebasingCount: 0, basis: null, failed: true };
  }
}

export default async function Home() {
  const { tickers, staleCount, rebasingCount, basis, failed } = await load();
  const widest = tickers.reduce((max, t) => Math.max(max, t.spreadBps ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="py-4">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The same stock has two prices on Solana.
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          Every US equity here is issued as more than one token, each with its own liquidity and its
          own price. Par measures what each trades at against the real share, and which one you can
          actually buy.
        </p>
      </section>

      <Card>
        <StatRow>
          <Stat label="Listings" value={allListings().length} detail="tokenized equities tracked" />
          <Stat label="Wrappers" value={allMints().length} detail={`${rebasingCount} rebasing`} />
          <Stat
            label="Stale multipliers"
            value={staleCount}
            tone={staleCount > 0 ? "warn" : undefined}
            detail="stored value no longer correct"
          />
          <Stat
            label="Widest spread"
            value={widest > 0 ? `${(widest / 100).toFixed(2)}pp` : "--"}
            tone={widest >= 200 ? "warn" : undefined}
            detail="same stock, two prices"
          />
        </StatRow>
      </Card>

      <Card>
        <CardHeader
          title="Cross-issuer dislocations"
          hint={basis ? `Premium measured against the real share price (${basis})` : "Premium measured against the real share price"}
        />
        {failed ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Market data is temporarily unavailable. The page refreshes automatically.
          </p>
        ) : (
          <MonitorTable tickers={tickers} />
        )}
      </Card>
    </div>
  );
}
