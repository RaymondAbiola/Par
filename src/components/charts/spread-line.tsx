"use client";

import { useState } from "react";

export interface SpreadPointView {
  capturedAt: string;
  session: string;
  marketLive: boolean;
  spreadBps: number;
}

const W = 720;
const H = 200;
const PAD = { top: 12, right: 52, bottom: 24, left: 40 };

function niceTicks(max: number): number[] {
  const step = max <= 200 ? 50 : max <= 600 ? 100 : max <= 1500 ? 250 : 500;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}

export function SpreadLine({ points, ticker }: { points: SpreadPointView[]; ticker: string }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Not enough history for {ticker} yet. More arrives with each capture run.
      </p>
    );
  }

  const t0 = new Date(points[0]!.capturedAt).getTime();
  const t1 = new Date(points.at(-1)!.capturedAt).getTime();
  const span = Math.max(1, t1 - t0);
  const maxSpread = Math.max(...points.map((p) => p.spreadBps), 10);
  const ticks = niceTicks(maxSpread);
  const top = ticks.at(-1) ?? maxSpread;

  const x = (iso: string) =>
    PAD.left + ((new Date(iso).getTime() - t0) / span) * (W - PAD.left - PAD.right);
  const y = (bps: number) => PAD.top + (1 - bps / top) * (H - PAD.top - PAD.bottom);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.capturedAt)} ${y(p.spreadBps)}`).join(" ");

  // shade the stretches when the underlying market was shut: the whole question this chart asks
  const bands: { from: number; to: number }[] = [];
  let open: number | null = null;
  points.forEach((p, i) => {
    if (!p.marketLive && open === null) open = x(p.capturedAt);
    if (p.marketLive && open !== null) {
      bands.push({ from: open, to: x(p.capturedAt) });
      open = null;
    }
    if (i === points.length - 1 && open !== null) bands.push({ from: open, to: x(p.capturedAt) });
  });

  const last = points.at(-1)!;
  const peak = points.reduce((a, b) => (b.spreadBps > a.spreadBps ? b : a));
  const active = hover === null ? null : points[hover];

  return (
    <div className="px-4 py-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Cross-issuer spread for ${ticker} over time`}>
        {bands.map((b, i) => (
          <rect key={i} x={b.from} y={PAD.top} width={Math.max(1, b.to - b.from)} height={H - PAD.top - PAD.bottom} fill="var(--color-raised)" />
        ))}

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {(t / 100).toFixed(t >= 100 ? 0 : 1)}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="var(--color-chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(last.capturedAt)} cy={y(last.spreadBps)} r={4} fill="var(--color-chart)" stroke="var(--color-surface)" strokeWidth={2} />
        <text x={x(last.capturedAt) + 10} y={y(last.spreadBps)} dy="0.32em" className="fill-ink text-[11px]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {(last.spreadBps / 100).toFixed(2)}pp
        </text>

        {peak !== last ? (
          <text x={x(peak.capturedAt)} y={y(peak.spreadBps) - 8} textAnchor="middle" className="fill-muted text-[10px]" style={{ fontVariantNumeric: "tabular-nums" }}>
            {(peak.spreadBps / 100).toFixed(2)}
          </text>
        ) : null}

        {active ? (
          <g>
            <line x1={x(active.capturedAt)} x2={x(active.capturedAt)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-line-strong)" strokeWidth={1} />
            <circle cx={x(active.capturedAt)} cy={y(active.spreadBps)} r={4} fill="var(--color-chart)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        ) : null}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={W - PAD.left - PAD.right}
          height={H - PAD.top - PAD.bottom}
          fill="transparent"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - box.left) / box.width;
            const target = t0 + ratio * span;
            let best = 0;
            points.forEach((p, i) => {
              if (Math.abs(new Date(p.capturedAt).getTime() - target) < Math.abs(new Date(points[best]!.capturedAt).getTime() - target)) best = i;
            });
            setHover(best);
          }}
        />
      </svg>

      <p className="mt-1 text-xs text-subtle">
        {active
          ? `${new Date(active.capturedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${(active.spreadBps / 100).toFixed(2)}pp · ${active.session}`
          : "Spread in percentage points. Shaded stretches are when the US market was closed."}
      </p>
    </div>
  );
}
