import Link from "next/link";
import { annotate } from "@/core/par/normalize";
import { scanDislocations } from "@/core/par/scan";
import { toWireTicker, type WireTicker } from "@/core/par/wire";
import { allListings, allMints, multiIssuerListings } from "@/core/registry";
import { fetchMultipliers } from "@/core/solana/multiplier";
import { MonitorTable } from "@/components/monitor/monitor-table";
import { Card, CardHeader } from "@/components/ui/card";
import { Premium, Spread } from "@/components/premium";
import { formatUsd } from "@/lib/format";

export const revalidate = 300;

interface Snapshot {
  tickers: WireTicker[];
  staleCount: number;
  staleXstocks: number;
  xstocksTotal: number;
  basis: string | null;
  failed: boolean;
}

async function load(): Promise<Snapshot> {
  const xstocksTotal = allListings().flatMap((l) => l.wrappers).filter((w) => w.issuer === "xstocks").length;

  try {
    const [results, multipliers] = await Promise.all([
      scanDislocations({ maxTickers: 60, maxLiveQuotes: 30, minLiquidityUsd: 25_000 }),
      fetchMultipliers(allMints()),
    ]);

    const byMint = new Map(
      allListings().flatMap((l) => l.wrappers.map((w) => [w.mint, w.issuer] as const)),
    );
    const states = [...multipliers.entries()];

    return {
      tickers: results.map((par) => toWireTicker(par, annotate(par.wrappers, "buy"))),
      staleCount: states.filter(([, s]) => s.stale).length,
      staleXstocks: states.filter(([m, s]) => s.stale && byMint.get(m) === "xstocks").length,
      xstocksTotal,
      basis: results.find((r) => r.reference)?.reference?.basis ?? null,
      failed: false,
    };
  } catch {
    // never fail the build over a rate-limited upstream
    return { tickers: [], staleCount: 0, staleXstocks: 0, xstocksTotal, basis: null, failed: true };
  }
}

/** A ticker where the best headline price belongs to a wrapper nobody can actually trade. */
function trapExample(tickers: WireTicker[]) {
  for (const t of tickers) {
    const priced = t.wrappers.filter((w) => w.premiumBps !== null);
    if (priced.length < 2) continue;

    const cheapest = priced.reduce((a, b) => (a.premiumBps! < b.premiumBps! ? a : b));
    const best = t.wrappers.find((w) => w.rank === 1);
    if (cheapest.recommendable === false && best && best.mint !== cheapest.mint) {
      return { ticker: t.ticker, trap: cheapest, best };
    }
  }
  return null;
}

export default async function Home() {
  const { tickers, staleCount, staleXstocks, xstocksTotal, basis, failed } = await load();
  const widest = tickers.reduce((max, t) => Math.max(max, t.spreadBps ?? 0), 0);
  const widestTicker = tickers.find((t) => (t.spreadBps ?? 0) === widest);
  const trap = trapExample(tickers);
  const stalePct = xstocksTotal > 0 ? Math.round((staleXstocks / xstocksTotal) * 100) : 0;

  return (
    <div className="space-y-10">
      <section className="hero-wash rise pt-6 pb-2 sm:pt-10">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-subtle uppercase">
          <span className="live-dot inline-block size-1.5 rounded-full bg-accent" aria-hidden />
          Live on Solana mainnet
        </div>

        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          The same stock has more than one price on Solana.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Apple, Nvidia and {multiIssuerListings().length - 2} other US equities are each issued as
          several competing tokens here, with separate liquidity and separate prices. Par measures
          every one against the real share and says which you can actually buy.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card sm:grid-cols-4">
          {[
            { label: "Tracked", value: allListings().length, detail: `${allMints().length} tokens` },
            { label: "Issued twice", value: multiIssuerListings().length, detail: "or more" },
            { label: "Worth comparing", value: tickers.length, detail: "deep on both sides" },
            {
              label: "Stale multipliers",
              value: staleCount,
              detail: "wrong on the mint",
              warn: true,
            },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-4 py-3.5">
              <div className="text-xs font-medium tracking-wide text-subtle uppercase">{s.label}</div>
              <div
                className={`figure mt-1.5 text-3xl leading-none font-semibold ${s.warn ? "text-warn" : ""}`}
              >
                {s.value}
              </div>
              <div className="mt-1.5 text-xs text-muted">{s.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card hover className="flex flex-col p-5">
          <h2 className="text-sm font-semibold">Two prices, one company</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {widestTicker
              ? `${widestTicker.ticker}'s wrappers are trading this far apart right now, on the same underlying share.`
              : "Wrappers of the same stock drift apart, especially when the market is shut."}
          </p>
          <div className="figure mt-4 text-3xl font-semibold">
            <Spread bps={widest || null} />
          </div>
        </Card>

        <Card hover className="flex flex-col p-5">
          <h2 className="text-sm font-semibold">Stored multipliers rot</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {stalePct}% of xStocks wrappers store a scaled-UI multiplier that is no longer the one in
            force. NFLXx reads 1 and is really 10.
          </p>
          <div className="figure mt-4 text-3xl font-semibold text-warn">
            {staleXstocks}
            <span className="text-lg text-subtle">/{xstocksTotal}</span>
          </div>
          <Link href="/check" className="mt-2 text-sm text-accent hover:underline">
            See the arithmetic →
          </Link>
        </Card>

        <Card hover className="flex flex-col p-5">
          <h2 className="text-sm font-semibold">Cheapest is often untradeable</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {trap
              ? `${trap.trap.symbol} shows the better headline on ${formatUsd(trap.trap.liquidityUsd ?? 0, true)} of liquidity. ${trap.best.symbol} is the one you can fill.`
              : "A wrapper can show the better price and have no liquidity behind it."}
          </p>
          {trap ? (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="figure text-3xl font-semibold">
                <Premium bps={trap.trap.premiumBps} size="lg" />
              </span>
              <span className="text-sm text-subtle">unfillable</span>
            </div>
          ) : null}
          {trap ? (
            <Link href={`/s/${trap.ticker}`} className="mt-2 text-sm text-accent hover:underline">
              Route a real quote →
            </Link>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Cross-issuer dislocations"
          hint={`${tickers.length} of ${multiIssuerListings().length} stocks issued by both issuers have enough liquidity on each side to compare. Premium measured against the real share price${basis ? ` (${basis})` : ""}.`}
        />
        {failed ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Market data is temporarily unavailable. The page refreshes automatically.
          </p>
        ) : (
          <MonitorTable tickers={tickers} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Build on Par"
          hint="Every number on this page is available to your own app. No key, no rate limit"
        />
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <div className="bg-surface px-4 py-3">
            <div className="text-sm font-medium">REST API</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Open, no key. Dislocations, venue decisions, stale multipliers, wallet valuation.
            </p>
            {/* an api route returning json, not a page: Link would try a client navigation */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/v1/ticker/NVDA"
              className="mt-2 inline-block font-mono text-sm text-accent hover:underline"
            >
              /api/v1/ticker/NVDA
            </a>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-sm font-medium">OpenAPI</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              3.1 spec covering every endpoint, including what a premium is measured against.
            </p>
            <a href="/api/v1/openapi" className="mt-2 inline-block font-mono text-sm text-accent hover:underline">
              /api/v1/openapi
            </a>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-sm font-medium">SDK</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Dependency-free client, plus the two pure functions that stop you being 10x wrong.
            </p>
            <a
              href="https://github.com/RaymondAbiola/Par/tree/main/sdk"
              className="mt-2 inline-block font-mono text-sm text-accent hover:underline"
            >
              @par/sdk
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
