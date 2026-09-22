"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { WireTicker } from "@/core/par/wire";

interface Point {
  key: string;
  ticker: string;
  symbol: string;
  issuer: string;
  liquidityUsd: number;
  premiumBps: number;
  pricePerShare: number | null;
  tradeable: boolean;
}

/** Fixed order, so a filter can never repaint an issuer. */
const ISSUERS = [
  { id: "xstocks", label: "xStocks", colour: "var(--color-iss-1)" },
  { id: "ondo", label: "Ondo", colour: "var(--color-iss-2)" },
  { id: "backpack", label: "Backpack", colour: "var(--color-iss-3)" },
] as const;

const W = 760;
const H = 380;
const PAD = { top: 18, right: 20, bottom: 40, left: 46 };

const X_MIN = 100;
const X_MAX = 10_000_000;
const LIQUIDITY_FLOOR = 25_000;
const X_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];

function tickLabel(v: number): string {
  if (v >= 1_000_000) return `$${v / 1_000_000}M`;
  if (v >= 1_000) return `$${v / 1_000}k`;
  return `$${v}`;
}

export function LiquidityScatter({ tickers }: { tickers: WireTicker[] }) {
  const [hover, setHover] = useState<Point | null>(null);

  const points = useMemo<Point[]>(
    () =>
      tickers.flatMap((t) =>
        t.wrappers.flatMap((w) => {
          if (w.premiumBps === null || w.liquidityUsd === null || w.liquidityUsd <= 0) return [];
          return [
            {
              key: w.mint,
              ticker: t.ticker,
              symbol: w.symbol,
              issuer: w.issuer,
              liquidityUsd: Math.max(X_MIN, Math.min(X_MAX, w.liquidityUsd)),
              premiumBps: w.premiumBps,
              pricePerShare: w.pricePerShare,
              tradeable: w.recommendable !== false,
            },
          ];
        }),
      ),
    [tickers],
  );

  if (points.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted">No pricing available yet.</p>;
  }

  // clamp the vertical range so a handful of outliers cannot flatten everything else
  const bound = Math.min(900, Math.max(300, ...points.map((p) => Math.abs(p.premiumBps))));

  const x = (liq: number) =>
    PAD.left +
    ((Math.log10(liq) - Math.log10(X_MIN)) / (Math.log10(X_MAX) - Math.log10(X_MIN))) *
      (W - PAD.left - PAD.right);
  const y = (bps: number) =>
    PAD.top + (1 - (Math.max(-bound, Math.min(bound, bps)) + bound) / (2 * bound)) * (H - PAD.top - PAD.bottom);

  const colourOf = (issuer: string) =>
    ISSUERS.find((i) => i.id === issuer)?.colour ?? "var(--color-subtle)";

  const yTicks = [bound, bound / 2, 0, -bound / 2, -bound].map((v) => Math.round(v));
  const thin = points.filter((p) => !p.tradeable).length;

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-[46rem] sm:w-full"
          role="img"
          aria-label="Every token plotted by liquidity against its distance from the real share price"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--color-line-strong)" : "var(--color-grid)"}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-subtle text-[11px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {t > 0 ? "+" : ""}
                {(t / 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {X_TICKS.map((t) => (
            <text
              key={t}
              x={x(t)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              className="fill-subtle text-[11px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {tickLabel(t)}
            </text>
          ))}

          {/* everything left of this cannot be filled at size, whatever its price says */}
          <line
            x1={x(LIQUIDITY_FLOOR)}
            x2={x(LIQUIDITY_FLOOR)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--color-warn)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
          <text
            x={x(LIQUIDITY_FLOOR) - 6}
            y={PAD.top + 10}
            textAnchor="end"
            className="fill-warn text-[11px]"
          >
            too thin to fill
          </text>

          {points.map((p, i) => {
            const active = hover?.key === p.key;
            return (
              <circle
                key={p.key}
                className="settle"
                style={{ animationDelay: `${Math.min(i * 6, 700)}ms` }}
                cx={x(p.liquidityUsd)}
                cy={y(p.premiumBps)}
                r={active ? 6 : 4}
                fill={p.tradeable ? colourOf(p.issuer) : "transparent"}
                stroke={colourOf(p.issuer)}
                strokeWidth={p.tradeable ? (active ? 2 : 0) : 1.5}
                paintOrder="stroke"
                opacity={hover === null || active ? 1 : 0.35}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

          <text
            x={(W - PAD.left) / 2 + PAD.left}
            y={H - 4}
            textAnchor="middle"
            className="fill-subtle text-[11px]"
          >
            liquidity, log scale
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {ISSUERS.map((i) => (
          <span key={i.id} className="flex items-center gap-1.5 text-muted">
            <span className="inline-block size-2.5 rounded-full" style={{ background: i.colour }} aria-hidden />
            {i.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-muted">
          <span
            className="inline-block size-2.5 rounded-full border-[1.5px] border-subtle"
            aria-hidden
          />
          hollow means too thin to fill
        </span>
      </div>

      <p className="mt-3 min-h-10 text-sm leading-relaxed text-muted">
        {hover ? (
          <>
            <span className="font-medium text-ink">{hover.symbol}</span> at{" "}
            <span className="tnum text-ink">
              {hover.pricePerShare === null ? "--" : formatUsd(hover.pricePerShare)}
            </span>{" "}
            sits <span className="tnum text-ink">{(hover.premiumBps / 100).toFixed(2)}%</span> from the
            real share on <span className="tnum text-ink">{formatUsd(hover.liquidityUsd, true)}</span> of
            liquidity.{hover.tradeable ? "" : " Not fillable at size."}
          </>
        ) : (
          <>
            {points.length} tokens plotted. {thin} of them sit left of the line, where the price shown
            is not a price you can get. The further left, the wilder the quote.
          </>
        )}
      </p>
    </div>
  );
}
