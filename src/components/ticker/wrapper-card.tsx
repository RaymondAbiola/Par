import { Premium } from "@/components/premium";
import { Badge } from "@/components/ui/badge";
import { formatUsd, truncateAddress } from "@/lib/format";
import type { WireWrapper } from "@/core/par/wire";

const ISSUER: Record<string, string> = { xstocks: "xStocks", ondo: "Ondo", backpack: "Backpack" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-sm text-subtle">{label}</span>
      <span className="tnum text-sm text-ink">{children}</span>
    </div>
  );
}

export function WrapperCard({ wrapper }: { wrapper: WireWrapper }) {
  const m = wrapper.multiplier;
  const factor = m && m.stored !== 0 ? m.effective / m.stored : 1;
  const bigError = Math.abs(factor - 1) > 0.5;

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{wrapper.symbol}</span>
            <Badge>{ISSUER[wrapper.issuer] ?? wrapper.issuer}</Badge>
            {wrapper.rank === 1 && wrapper.recommendable ? <Badge tone="accent">cheapest</Badge> : null}
          </div>
          <div className="mt-1 font-mono text-[11px] text-subtle">{truncateAddress(wrapper.mint, 6)}</div>
        </div>
        <div className="text-right">
          <div className="tnum text-lg font-medium">
            {wrapper.pricePerShare === null ? "--" : formatUsd(wrapper.pricePerShare)}
          </div>
          <Premium bps={wrapper.premiumBps} />
        </div>
      </div>

      <div className="px-4 py-2">
        <Row label="Liquidity">{wrapper.liquidityUsd === null ? "--" : formatUsd(wrapper.liquidityUsd, true)}</Row>
        <Row label="24h volume">{wrapper.volume24hUsd === null ? "--" : formatUsd(wrapper.volume24hUsd, true)}</Row>
        <Row label="Holders">{wrapper.holders?.toLocaleString() ?? "--"}</Row>
        <Row label="Multiplier">{m ? m.effective.toFixed(6) : "--"}</Row>
      </div>

      {wrapper.recommendable === false ? (
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          {wrapper.excludedBecause === "unroutable"
            ? "No route at the size tested."
            : wrapper.excludedBecause === "no-price"
              ? "No on-chain price available."
              : "Too little liquidity to trade at size, whatever the headline price says."}
        </p>
      ) : null}

      {m?.stale ? (
        <div className="border-t border-line bg-warn-soft px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge tone="warn">stale multiplier</Badge>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-warn">
            The mint still stores <span className="tnum">{m.stored.toFixed(6)}</span>, but{" "}
            <span className="tnum">{m.effective.toFixed(6)}</span> has been in force since{" "}
            {m.effectiveFrom ? new Date(m.effectiveFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "an earlier date"}.
            {bigError ? (
              <>
                {" "}
                Reading the stored value prices this token at{" "}
                <span className="tnum font-medium">a {factor.toFixed(0)}th</span> of its real worth.
              </>
            ) : (
              <>
                {" "}
                A naive read is off by <span className="tnum font-medium">{Math.abs(m.naiveErrorBps).toFixed(0)}bp</span>.
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
