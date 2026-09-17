import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTickerPar } from "@/core/par/engine";
import { annotate } from "@/core/par/normalize";
import { toWireTicker } from "@/core/par/wire";
import { getListing } from "@/core/registry";
import { ExecutionPanel } from "@/components/ticker/execution-panel";
import { WrapperCard } from "@/components/ticker/wrapper-card";
import { Spread } from "@/components/premium";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const listing = getListing(ticker);
  if (!listing) return { title: "Unknown ticker" };

  return {
    title: `${listing.ticker} on Solana`,
    description: `What ${listing.name} trades at across every tokenized wrapper on Solana, against the real share price.`,
  };
}

export default async function TickerPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!getListing(ticker)) notFound();

  const par = await getTickerPar(ticker);
  if (!par) notFound();

  const wire = toWireTicker(par, annotate(par.wrappers, "buy"));
  const stale = wire.wrappers.filter((w) => w.multiplier?.stale);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{wire.ticker}</h1>
            <Badge>{wire.instrument === "etf" ? "ETF" : "Stock"}</Badge>
          </div>
          <p className="mt-1 text-muted">{wire.name}</p>
        </div>

        <div className="text-right">
          <div className="text-xs tracking-wide text-subtle uppercase">Real share price</div>
          <div className="tnum text-2xl font-medium">
            {wire.reference ? formatUsd(wire.reference.price) : "--"}
          </div>
          <div className="mt-0.5 text-xs text-subtle">{wire.reference?.basis ?? "unavailable"}</div>
        </div>
      </section>

      {wire.spreadBps !== null && wire.spreadBps > 0 ? (
        <Card className="px-4 py-3">
          <p className="text-sm">
            These wrappers are <Spread bps={wire.spreadBps} /> apart on the same underlying share.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {wire.wrappers.map((w) => (
          <WrapperCard key={w.mint} wrapper={w} />
        ))}
      </div>

      <Card>
        <CardHeader
          title="What it actually costs"
          hint="Routes a real quote at your size, because displayed price is not execution price"
        />
        <ExecutionPanel ticker={wire.ticker} />
      </Card>

      {stale.length > 0 ? (
        <p className="text-sm leading-relaxed text-subtle">
          {stale.length === 1
            ? "One wrapper here stores a scaled-UI multiplier that no longer matches the one in force."
            : `${stale.length} wrappers here store scaled-UI multipliers that no longer match the ones in force.`}{" "}
          Any integration reading the stored field without checking its effective timestamp will
          misprice the position.
        </p>
      ) : null}
    </div>
  );
}
