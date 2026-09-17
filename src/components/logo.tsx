/**
 * Two measurements against a reference line: one falls short of par, one overshoots it.
 * That is the whole product, so the mark says it rather than decorating around it.
 */
export function Logo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      role="img"
      aria-label="Par"
    >
      {/* par: the reference the two wrappers are measured against */}
      <line x1="13" y1="2.5" x2="13" y2="17.5" stroke="currentColor" strokeWidth="1.25" opacity="0.4" />

      {/* a discount: stops short of par */}
      <line x1="3" y1="7" x2="9.5" y2="7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />

      {/* a premium: overshoots it */}
      <line x1="3" y1="13" x2="16.5" y2="13" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}
