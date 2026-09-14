import { formatPercent } from "@/lib/format";

/**
 * The signature number. Sign is always explicit and colour always means the same thing:
 * red is dearer than the real share, green is cheaper.
 */
export function Premium({
  bps,
  size = "base",
  showSign = true,
}: {
  bps: number | null;
  size?: "sm" | "base" | "lg";
  showSign?: boolean;
}) {
  if (bps === null) return <span className="tnum text-subtle">--</span>;

  const pct = bps / 100;
  const tone = Math.abs(pct) < 0.005 ? "text-muted" : pct > 0 ? "text-premium" : "text-discount";
  const sizes = { sm: "text-xs", base: "text-sm", lg: "text-xl" };

  return (
    <span className={`tnum font-medium ${tone} ${sizes[size]}`}>
      {showSign ? formatPercent(pct) : `${Math.abs(pct).toFixed(2)}%`}
    </span>
  );
}

export function Spread({ bps }: { bps: number | null }) {
  if (bps === null) return <span className="tnum text-subtle">--</span>;
  const pp = bps / 100;
  const heavy = pp >= 2;

  return (
    <span className={`tnum font-medium ${heavy ? "text-warn" : "text-ink"}`}>{pp.toFixed(2)}pp</span>
  );
}
