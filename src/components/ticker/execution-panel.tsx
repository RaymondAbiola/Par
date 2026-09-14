"use client";

import { useState } from "react";
import { Premium } from "@/components/premium";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import type { WireWrapper } from "@/core/par/wire";

const SIZES = [1_000, 10_000, 50_000] as const;

interface Decision {
  best: string | null;
  savingUsd: number | null;
  maxSavingUsd: number | null;
}

export function ExecutionPanel({ ticker }: { ticker: string }) {
  const [size, setSize] = useState<number | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [loading, setLoading] = useState(false);
  const [wrappers, setWrappers] = useState<WireWrapper[] | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function measure(nextSize: number, nextSide: "buy" | "sell") {
    setSize(nextSize);
    setSide(nextSide);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/ticker/${ticker}?size=${nextSize}&side=${nextSide}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not measure execution");
      setWrappers(body.data.wrappers);
      setDecision(body.data.decision);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not measure execution");
      setWrappers(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded border border-line p-0.5">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => (size ? measure(size, s) : setSide(s))}
              className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                side === s ? "bg-raised text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => measure(s, side)}
            disabled={loading}
            className={`rounded border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
              size === s ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
            }`}
          >
            {formatUsd(s, true)}
          </button>
        ))}

        {loading ? <span className="text-xs text-subtle">quoting…</span> : null}
      </div>

      {error ? <p className="mt-3 text-xs text-premium">{error}</p> : null}

      {!wrappers && !loading && !error ? (
        <p className="mt-3 text-xs text-muted">
          Pick a size to route a real quote through each wrapper. Headline price is not what you pay.
        </p>
      ) : null}

      {wrappers ? (
        <div className="mt-4 space-y-2">
          {wrappers.map((w) => {
            const exec = w.execution;
            return (
              <div
                key={w.mint}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-line px-3 py-2"
              >
                <span className="min-w-20 text-sm font-medium">{w.symbol}</span>
                {exec?.routable ? (
                  <>
                    <span className="text-xs text-muted">
                      slippage <span className="tnum text-ink">{exec.slippageBps?.toFixed(0)}bp</span>
                    </span>
                    <span className="text-xs text-muted">
                      all-in{" "}
                      <Premium bps={exec.allInBps} size="sm" />
                    </span>
                    {decision?.best === w.symbol ? <Badge tone="accent">best</Badge> : null}
                  </>
                ) : (
                  <span className="text-xs text-subtle">
                    no route at {size ? formatUsd(size, true) : "this size"}
                  </span>
                )}
              </div>
            );
          })}

          {decision?.savingUsd ? (
            <p className="pt-1 text-sm">
              Choosing <span className="font-medium">{decision.best}</span> saves{" "}
              <span className="tnum font-medium text-discount">{formatUsd(decision.savingUsd)}</span> on this
              trade.
            </p>
          ) : decision?.best ? (
            <p className="pt-1 text-sm text-muted">
              <span className="font-medium text-ink">{decision.best}</span> is the only wrapper that routes at
              this size.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
