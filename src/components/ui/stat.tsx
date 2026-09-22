import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "premium" | "discount" | "warn" | "accent";
}) {
  const colour =
    tone === "premium"
      ? "text-premium"
      : tone === "discount"
        ? "text-discount"
        : tone === "warn"
          ? "text-warn"
          : tone === "accent"
            ? "text-accent"
            : "";

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="text-xs font-medium tracking-wide text-subtle uppercase">{label}</div>
      <div className={`figure mt-1.5 text-3xl leading-none font-semibold ${colour}`}>{value}</div>
      {detail ? <div className="mt-2 text-sm leading-snug text-muted">{detail}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
      {children}
    </div>
  );
}
