"use client";

import { useState } from "react";
import { formatUsd, truncateAddress } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface Position {
  mint: string;
  symbol: string;
  shares: number;
  naiveShares: number;
  value: number | null;
  naiveValue: number | null;
  multiplier: { effective: number; stored: number; stale: boolean };
}

interface Result {
  owner: string;
  basis: string | null;
  totalValue: number;
  naiveTotal: number;
  positions: Position[];
}

export function WalletLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const owner = address.trim();
    if (!owner) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/v1/portfolio/${owner}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Lookup failed");
      setResult(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const gap = result ? result.totalValue - result.naiveTotal : 0;

  return (
    <div className="px-4 py-4">
      <form onSubmit={lookup} className="flex flex-wrap gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Solana wallet address"
          spellCheck={false}
          className="min-w-0 flex-1 rounded border border-line bg-ground px-2.5 py-1.5 font-mono text-sm placeholder:font-sans placeholder:text-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
        >
          {loading ? "Reading…" : "Value it"}
        </button>
      </form>

      {error ? <p className="mt-3 text-xs text-premium">{error}</p> : null}

      {result && result.positions.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No tokenized equities held by {truncateAddress(result.owner, 6)}.
        </p>
      ) : null}

      {result && result.positions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-sm text-muted">
              Correct value <span className="tnum text-base font-medium text-ink">{formatUsd(result.totalValue)}</span>
            </span>
            <span className="text-sm text-muted">
              Ignoring multipliers <span className="tnum text-base font-medium text-premium">{formatUsd(result.naiveTotal)}</span>
            </span>
            {gap > 0.005 ? (
              <span className="text-sm">
                understated by <span className="tnum font-medium text-premium">{formatUsd(gap)}</span>
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-[11px] tracking-wide text-subtle uppercase">
                  <th className="py-2 pr-4 font-medium">Token</th>
                  <th className="py-2 pr-4 text-right font-medium">Shares</th>
                  <th className="py-2 pr-4 text-right font-medium">Naive</th>
                  <th className="py-2 pr-4 text-right font-medium">Value</th>
                  <th className="py-2 text-right font-medium">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {result.positions.map((p) => (
                  <tr key={p.mint} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-medium">{p.symbol}</span>
                      {p.multiplier.stale ? (
                        <span className="ml-2">
                          <Badge tone="warn">stale</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="tnum py-2 pr-4 text-right">{p.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className="tnum py-2 pr-4 text-right text-subtle">
                      {p.naiveShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="tnum py-2 pr-4 text-right">{p.value === null ? "--" : formatUsd(p.value)}</td>
                    <td className="tnum py-2 text-right text-muted">{p.multiplier.effective.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.basis ? <p className="text-xs text-subtle">Priced against {result.basis}.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
