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

async function load(ticker: string | null) {
  if (!hasDatabase()) return null;
  try {
    const [coverage, sessions, tickers] = await Promise.all([
      getCoverage(),
      getSessionStats(168),
      getTrackedTickers(12),
    ]);
    const selected = ticker && tickers.includes(ticker) ? ticker : (tickers[0] ?? null);
    const series = selected ? await getSpreadSeries(selected, 168) : [];
    return { coverage, sessions, tickers, selected, series };
  } catch {
    return null;
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker } = await searchParams;
  const data = await load(ticker?.toUpperCase() ?? null);

  if (!data || data.coverage.runs === 0) {
    return (
      <div className="space-y-6">
        <section className="py-4">
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-3 max-w-xl leading-relaxed text-muted">
            Par snapshots every tracked wrapper every 15 minutes, so the dislocation can be measured
            over time rather than guessed at.
          </p>
        </section>
        <Card>
          <p className="px-4 py-12 text-center text-sm text-muted">
            No history captured yet. Once the collector has run a few times this page shows how the
            spread behaves in each market session.
          </p>
        </Card>
      </div>
    );
  }

  const { coverage, sessions, tickers, selected, series } = data;
  const closed = sessions.filter((s) => s.session !== "regular");
  const regular = sessions.find((s) => s.session === "regular");
  const closedMedian =
    closed.length > 0 ? closed.reduce((n, s) => n + s.medianSpreadBps, 0) / closed.length : null;

  return (
    <div className="space-y-6">
      <section className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          Par snapshots every tracked wrapper every 15 minutes. The question this page answers: does
          the gap between issuers widen when the underlying market is shut?
        </p>
      </section>

      <Card>
        <StatRow>
          <Stat label="Snapshots" value={coverage.runs.toLocaleString()} detail="capture runs" />
          <Stat label="Rows" value={coverage.rows.toLocaleString()} detail="wrapper observations" />
          <Stat label="Tickers" value={tickers.length} detail="with history" />
          <Stat
            label="Since"
            value={coverage.since ? new Date(coverage.since).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "--"}
            detail="first snapshot"
          />
        </StatRow>
      </Card>

      <Card>
        <CardHeader
          title="Dislocation by market session"
          hint={
            regular && closedMedian !== null
              ? `Market open: ${(regular.medianSpreadBps / 100).toFixed(2)}pp. Closed sessions average ${(closedMedian / 100).toFixed(2)}pp.`
              : "Median cross-issuer spread in each session"
          }
        />
        <SessionBars data={sessions} />

        <table className="w-full border-t border-line text-sm">
          <caption className="sr-only">Median spread and sample count by market session</caption>
          <thead>
            <tr className="text-left text-[11px] tracking-wide text-subtle uppercase">
              <th className="px-4 py-2 font-medium">Session</th>
              <th className="px-4 py-2 text-right font-medium">Samples</th>
              <th className="px-4 py-2 text-right font-medium">Median spread</th>
              <th className="px-4 py-2 text-right font-medium">Mean premium</th>
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
