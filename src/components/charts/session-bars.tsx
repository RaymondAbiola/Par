"use client";

import { useState } from "react";
import { SESSION_LABEL, type MarketSession } from "@/core/prices/session";

export interface SessionDatum {
  session: string;
  samples: number;
  medianSpreadBps: number;
}

const BAR = 20;
const GAP = 14;
const LABEL_W = 104;
const VALUE_W = 64;

/**
 * One measure across nominal categories, so every bar carries the same hue. Colouring by
 * magnitude would double-encode bar length and burn the only free channel.
 */
export function SessionBars({ data }: { data: SessionDatum[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">No sessions captured yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.medianSpreadBps), 1);
  const plotW = 280;
  const height = data.length * (BAR + GAP) + GAP;

  return (
    <div className="overflow-x-auto px-4 py-4">
      <svg
        viewBox={`0 0 ${LABEL_W + plotW + VALUE_W} ${height}`}
        className="w-full min-w-[26rem]"
        style={{ maxHeight: height * 1.6 }}
        role="img"
        aria-label="Median cross-issuer spread by market session"
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

        {data.map((d, i) => {
          const y = GAP + i * (BAR + GAP);
          const w = Math.max(2, (d.medianSpreadBps / max) * plotW);
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
                {(d.medianSpreadBps / 100).toFixed(2)}pp
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-xs text-subtle">
        {hover === null
          ? "Median cross-issuer spread, by session."
          : `${SESSION_LABEL[data[hover]?.session as MarketSession] ?? data[hover]?.session}: ${data[hover]?.samples.toLocaleString()} samples`}
      </p>
    </div>
  );
}
