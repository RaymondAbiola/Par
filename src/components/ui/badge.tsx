import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "warn" | "premium" | "discount";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-raised text-muted",
  accent: "border-accent-line bg-accent-soft text-accent",
  warn: "border-transparent bg-warn-soft text-warn",
  premium: "border-transparent bg-raised text-premium",
  discount: "border-transparent bg-raised text-discount",
};

export function Badge({
  children,
  tone = "neutral",
  mono = false,
}: {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONES[tone]} ${mono ? "tnum" : ""}`}
    >
      {children}
    </span>
  );
}
