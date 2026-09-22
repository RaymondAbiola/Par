import type { Metadata } from "next";
import Link from "next/link";
import { hasDatabase } from "@/core/db/client";
import { getCoverage, getSessionStats, getSpreadSeries, getTrackedTickers } from "@/core/db/history";
import { SessionBars } from "@/components/charts/session-bars";
import { SpreadLine } from "@/components/charts/spread-line";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat, StatRow } from "@/components/ui/stat";
import { SESSION_LABEL, type MarketSession } from "@/core/prices/session";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "History",
  description:
    "How cross-issuer dislocation in tokenized equities changes between market sessions on Solana.",
};

type LoadResult =
  | { status: "no-database" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | {
      status: "ok";
      coverage: Awaited<ReturnType<typeof getCoverage>>;
      sessions: Awaited<ReturnType<typeof getSessionStats>>;
      tickers: string[];
      selected: string | null;
      series: Awaited<ReturnType<typeof getSpreadSeries>>;
    };

async function load(ticker: string | null): Promise<LoadResult> {
  if (!hasDatabase()) return { status: "no-database" };

  try {
    const [coverage, sessions, tickers] = await Promise.all([
      getCoverage(),
      getSessionStats(168),
      getTrackedTickers(12),
    ]);

    if (coverage.runs === 0) return { status: "empty" };

    const selected = ticker && tickers.includes(ticker) ? ticker : (tickers[0] ?? null);
    const series = selected ? await getSpreadSeries(selected, 168) : [];
    return { status: "ok", coverage, sessions, tickers, selected, series };
  } catch (error) {
    // swallowing this silently is how a broken connection string looks identical to no data
    console.error("[history] load failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "unknown error" };
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker } = await searchParams;
  const data = await load(ticker?.toUpperCase() ?? null);

  if (data.status !== "ok") {
    const copy =
      data.status === "no-database"
        ? "History needs a database connection, and none is configured here."
        : data.status === "empty"
          ? "No history captured yet. Once the collector has run a few times this page shows how dislocation behaves in each market session."
          : "History is temporarily unavailable. The collector keeps running and this page recovers on its own.";

    return (
      <div className="space-y-6">
        <section className="py-4">
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-3 max-w-xl leading-relaxed text-muted">
            Par snapshots every tracked wrapper on a schedule, so dislocation can be measured over
            time rather than guessed at.
          </p>
        </section>
        <Card>
          <p className="px-4 py-12 text-center text-sm text-muted">{copy}</p>
          {data.status === "error" && process.env.NODE_ENV !== "production" ? (
            <p className="border-t border-line px-4 py-3 font-mono text-xs text-premium">
              {data.message}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  const { coverage, sessions, tickers, selected, series } = data;
  const weekend = sessions.find((s) => s.session === "weekend");
  const busiest = sessions.reduce<typeof sessions[number] | null>(
    (best, s) => (best === null || s.samples > best.samples ? s : best),
    null,
  );

  return (
    <div className="space-y-6">
      <section className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          Par snapshots every tracked wrapper{" "}
          {coverage.medianGapMinutes === null
            ? "on a schedule"
            : coverage.medianGapMinutes >= 90
              ? `roughly every ${(coverage.medianGapMinutes / 60).toFixed(1)} hours`
              : `roughly every ${Math.round(coverage.medianGapMinutes)} minutes`}
          . We expected the gap between issuers to widen when the market shut. It does not. What
          widens is something else.
        </p>
      </section>

      <Card>
        <StatRow>
          <Stat label="Snapshots" value={coverage.runs.toLocaleString()} detail="capture runs" />
          <Stat label="Rows" value={coverage.rows.toLocaleString()} detail="wrapper observations" />
          <Stat label="Tickers" value={coverage.tickers} detail="with history" />
          <Stat
            label="Since"
            value={coverage.since ? new Date(coverage.since).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "--"}
            detail={
              coverage.medianGapMinutes === null
                ? "first snapshot"
                : coverage.medianGapMinutes >= 90
                  ? `now every ${(coverage.medianGapMinutes / 60).toFixed(1)}h`
                  : `now every ${Math.round(coverage.medianGapMinutes)}m`
            }
          />
        </StatRow>
      </Card>

      <Card>
        <CardHeader
          title="Two kinds of dislocation, and they disagree"
          hint={`Across ${coverage.runs.toLocaleString()} capture runs. Issuers agree with each other most when nothing is moving, and the whole market drifts furthest from fair value when nobody can arbitrage it.`}
        />

        <div className="grid gap-px bg-line md:grid-cols-2">
          <div className="bg-surface">
            <div className="border-b border-line px-4 py-2.5">
              <h3 className="text-sm font-medium">Spread between issuers</h3>
              <p className="mt-0.5 text-xs text-subtle">
                How much the wrappers of one stock disagree with each other
              </p>
            </div>
            <SessionBars data={sessions} measure="spread" />
          </div>

          <div className="bg-surface">
            <div className="border-b border-line px-4 py-2.5">
              <h3 className="text-sm font-medium">Drift from the real share</h3>
              <p className="mt-0.5 text-xs text-subtle">
                How far they collectively sit from the underlying price
              </p>
            </div>
            <SessionBars data={sessions} measure="premium" />
          </div>
        </div>

        {weekend && busiest ? (
          <div className="border-t border-line bg-raised px-4 py-3.5 sm:px-5">
            <p className="text-sm leading-relaxed text-muted">
              The weekend has the{" "}
              <span className="font-medium text-ink">narrowest spread between issuers</span> at{" "}
              <span className="tnum text-ink">{(weekend.medianSpreadBps / 100).toFixed(2)}pp</span>,
              and the <span className="font-medium text-ink">largest drift from fair value</span> at{" "}
              <span className="tnum text-ink">{(weekend.meanAbsPremiumBps / 100).toFixed(2)}%</span>.
              Nothing trades, so every wrapper sits still and they all agree, while the price they
              agree on slides further from Friday&rsquo;s close. During the session the underlying
              moves, wrappers re-price at different speeds, and they disagree with each other most
              while tracking the real share most closely.
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Spread, drift and sample count by market session</caption>
          <thead>
            <tr className="text-left text-xs tracking-wide text-subtle uppercase">
              <th className="px-4 py-2 font-medium">Session</th>
              <th className="px-4 py-2 text-right font-medium">Samples</th>
              <th className="px-4 py-2 text-right font-medium">Spread</th>
              <th className="px-4 py-2 text-right font-medium">Drift</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session} className="border-t border-line/60">
                <td className="px-4 py-2">{SESSION_LABEL[s.session as MarketSession] ?? s.session}</td>
                <td className="tnum px-4 py-2 text-right text-muted">{s.samples.toLocaleString()}</td>
                <td className="tnum px-4 py-2 text-right">{(s.medianSpreadBps / 100).toFixed(2)}pp</td>
                <td className="tnum px-4 py-2 text-right text-muted">{(s.meanAbsPremiumBps / 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card>
        <CardHeader title={selected ? `${selected} spread over time` : "Spread over time"} />
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          {tickers.map((t) => (
            <Link
              key={t}
              href={`/history?ticker=${t}`}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                t === selected ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
        <SpreadLine points={series} ticker={selected ?? ""} />
      </Card>
    </div>
  );
}
