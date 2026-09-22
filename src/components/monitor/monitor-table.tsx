"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Premium, Spread } from "@/components/premium";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import type { WireTicker, WireWrapper } from "@/core/par/wire";

type SortKey = "spread" | "liquidity" | "ticker";

const ISSUER_LABEL: Record<string, string> = {
  xstocks: "xStocks",
  ondo: "Ondo",
  backpack: "Backpack",
};

function deepest(t: WireTicker): number {
  return Math.max(0, ...t.wrappers.map((w) => w.liquidityUsd ?? 0));
}

function WrapperCell({
  wrapper,
  best,
  extra = 0,
}: {
  wrapper: WireWrapper | undefined;
  best?: boolean;
  /** How many further wrappers exist beyond this one, so a third issuer is never silently dropped. */
  extra?: number;
}) {
  if (!wrapper) return <span className="text-subtle">--</span>;

  return (
    <div className="whitespace-nowrap text-right md:text-left">
      <div className="flex items-center justify-end gap-1.5 md:justify-start">
        <span className={`text-sm ${best ? "text-ink" : "text-muted"}`}>{wrapper.symbol}</span>
        {extra > 0 ? <span className="text-[11px] text-subtle">+{extra} more</span> : null}
        {wrapper.recommendable === false ? (
          <span
            className="text-[11px] text-subtle"
            title={
              wrapper.excludedBecause === "unroutable"
                ? "No route exists at the size tested"
                : wrapper.excludedBecause === "no-price"
                  ? "No on-chain price available"
                  : "Too little liquidity to fill at size, whatever the price says"
            }
          >
            {wrapper.excludedBecause === "unroutable" ? "no route" : "thin"}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 flex items-baseline justify-end gap-2 md:justify-start">
        <span className="tnum text-sm text-muted">
          {wrapper.pricePerShare === null ? "--" : formatUsd(wrapper.pricePerShare)}
        </span>
        <Premium bps={wrapper.premiumBps} size="base" />
      </div>
    </div>
  );
}

export function MonitorTable({ tickers }: { tickers: WireTicker[] }) {
  const [sort, setSort] = useState<SortKey>("spread");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toUpperCase();
    const filtered = needle
      ? tickers.filter((t) => t.ticker.includes(needle) || t.name.toUpperCase().includes(needle))
      : tickers;

    return [...filtered].sort((a, b) => {
      if (sort === "ticker") return a.ticker.localeCompare(b.ticker);
      if (sort === "liquidity") return deepest(b) - deepest(a);
      return (b.spreadBps ?? -1) - (a.spreadBps ?? -1);
    });
  }, [tickers, sort, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by ticker or name"
          className="w-full max-w-56 rounded border border-line bg-ground px-2.5 py-1.5 text-sm placeholder:text-subtle focus:border-accent focus:outline-none"
        />
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="mr-1 text-subtle">Sort</span>
          {(["spread", "liquidity", "ticker"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`rounded px-2 py-1 capitalize transition-colors ${
                sort === key ? "bg-raised text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 text-right font-medium">Real share</th>
              <th className="px-4 py-2 font-medium">Best to buy</th>
              <th className="px-4 py-2 font-medium">Other</th>
              <th className="px-4 py-2 text-right font-medium">Spread</th>
              <th className="px-4 py-2 text-right font-medium">Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const ranked = [...t.wrappers].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
              const [best, alt] = ranked;
              const extra = Math.max(0, ranked.length - 2);
              const stale = t.wrappers.some((w) => w.multiplier?.stale);

              return (
                <tr key={t.ticker} className="border-b border-line/60 last:border-0 hover:bg-raised/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/s/${t.ticker}`} className="flex items-baseline gap-2">
                      <span className="font-medium">{t.ticker}</span>
                      <span className="hidden max-w-40 truncate text-sm text-subtle sm:inline">{t.name}</span>
                      {stale ? <Badge tone="warn">stale</Badge> : null}
                    </Link>
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-muted">
                    {t.reference ? formatUsd(t.reference.price) : "--"}
                  </td>
                  <td className="px-4 py-2.5">
                    <WrapperCell wrapper={best} best />
                  </td>
                  <td className="px-4 py-2.5">
                    <WrapperCell wrapper={alt} extra={extra} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {t.spreadBps === null ? (
                      <span className="text-xs text-subtle">sole venue</span>
                    ) : (
                      <Spread bps={t.spreadBps} />
                    )}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-sm text-muted">
                    {formatUsd(deepest(t), true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden">
        {rows.map((t) => {
          const ranked = [...t.wrappers].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
          const [best, alt] = ranked;
          const extra = Math.max(0, ranked.length - 2);
          const stale = t.wrappers.some((w) => w.multiplier?.stale);

          return (
            <li key={t.ticker} className="border-b border-line/60 last:border-0">
              <Link href={`/s/${t.ticker}`} className="block px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-medium">{t.ticker}</span>
                    <span className="truncate text-xs text-subtle">{t.name}</span>
                    {stale ? <Badge tone="warn">stale</Badge> : null}
                  </div>
                  {t.spreadBps === null ? (
                    <span className="text-xs text-subtle">sole venue</span>
                  ) : (
                    <Spread bps={t.spreadBps} />
                  )}
                </div>

                <div className="tnum mt-0.5 text-xs text-subtle">
                  real share {t.reference ? formatUsd(t.reference.price) : "--"}
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {[best, alt].map((w, i) =>
                    w ? (
                      <div key={w.mint} className="flex items-baseline justify-between gap-3">
                        <span className="text-xs text-subtle">{i === 0 ? "Best to buy" : "Other"}</span>
                        <WrapperCell wrapper={w} best={i === 0} extra={i === 1 ? extra : 0} />
                      </div>
                    ) : null,
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Nothing matches that filter.</p>
      ) : null}

      <p className="border-t border-line px-4 py-2.5 text-sm leading-relaxed text-subtle">
        Ranked by what you can actually fill, not by headline price. A wrapper marked{" "}
        <span className="text-muted">thin</span> or <span className="text-muted">no route</span> sits
        on too little liquidity to trade at size. Where only one wrapper is fillable there is no real
        spread to quote, so the column reads <span className="text-muted">sole venue</span> rather
        than differencing against a price nobody can get. Issuers:{" "}
        {Object.values(ISSUER_LABEL).join(", ")}.
      </p>
    </div>
  );
}
