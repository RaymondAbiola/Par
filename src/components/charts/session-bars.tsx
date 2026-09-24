"use client";

import { useState } from "react";
import { SESSION_LABEL, type MarketSession } from "@/core/prices/session";

export interface SessionDatum {
  session: string;
  samples: number;
  medianSpreadBps: number;
  medianAbsPremiumBps: number;
}

export type Measure = "spread" | "premium";

const BAR = 20;
const GAP = 14;
const LABEL_W = 104;
const VALUE_W = 64;

/**
 * One measure across nominal categories, so every bar carries the same hue. Colouring by
 * magnitude would double-encode bar length and burn the only free channel.
 */
export function SessionBars({
  data,
  measure = "spread",
}: {
  data: SessionDatum[];
  measure?: Measure;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const pick = (d: SessionDatum) =>
    measure === "spread" ? d.medianSpreadBps : d.medianAbsPremiumBps;
  const unit = measure === "spread" ? "pp" : "%";

  if (data.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">No sessions captured yet.</p>;
  }

  const ordered = [...data].sort((a, b) => pick(b) - pick(a));
  const max = Math.max(...ordered.map(pick), 1);
  const plotW = 280;
  const height = ordered.length * (BAR + GAP) + GAP;

  return (
    <div className="overflow-x-auto px-4 py-4">
      <svg
        viewBox={`0 0 ${LABEL_W + plotW + VALUE_W} ${height}`}
        className="w-full min-w-[26rem]"
        style={{ maxHeight: height * 1.6 }}
        role="img"
        aria-label={
          measure === "spread"
            ? "Median spread between issuers by market session"
            : "Mean drift from the real share price by market session"
        }
      >
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={LABEL_W + plotW * t}
            x2={LABEL_W + plotW * t}
            y1={GAP / 2}
            y2={height - GAP / 2}
            stroke="var(--color-grid)"
            strokeWidth={1}
          />
        ))}

        {ordered.map((d, i) => {
          const y = GAP + i * (BAR + GAP);
          const w = Math.max(2, (pick(d) / max) * plotW);
          const label = SESSION_LABEL[d.session as MarketSession] ?? d.session;

          return (
            <g
              key={d.session}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "default" }}
            >
              <rect x={0} y={y - GAP / 2} width={LABEL_W + plotW + VALUE_W} height={BAR + GAP} fill="transparent" />
              <text x={LABEL_W - 10} y={y + BAR / 2} dy="0.35em" textAnchor="end" className="fill-muted text-[11px]">
                {label}
              </text>
              <path
                d={`M ${LABEL_W} ${y} h ${w - 4} a 4 4 0 0 1 4 4 v ${BAR - 8} a 4 4 0 0 1 -4 4 h ${-(w - 4)} z`}
                fill="var(--color-chart)"
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text
                x={LABEL_W + w + 8}
                y={y + BAR / 2}
                dy="0.35em"
                className="fill-ink text-[11px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {(pick(d) / 100).toFixed(2)}
                {unit}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-xs text-subtle">
        {hover === null
          ? measure === "spread"
            ? "How far apart the issuers are from each other."
            : "How far the tokens sit from the real share price."
          : `${SESSION_LABEL[ordered[hover]?.session as MarketSession] ?? ordered[hover]?.session}: ${ordered[hover]?.samples.toLocaleString()} samples`}
      </p>
    </div>
  );
}
