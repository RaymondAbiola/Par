"use client";

import { useEffect, useState } from "react";
import { getSession, SESSION_LABEL, SESSION_SHORT, type SessionState } from "@/core/prices/session";

/**
 * Computed on the client and only after mount. The session changes while a page sits in cache, so
 * rendering it on the server would either freeze it at build time or mismatch on hydration.
 */
export function SessionBadge({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<SessionState | null>(null);

  useEffect(() => {
    const tick = () => setState(getSession());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!state) {
    return <span className="h-6 w-16 rounded-full bg-raised sm:w-24" aria-hidden />;
  }

  const tone = state.live
    ? "border-discount/30 bg-discount/10 text-discount"
    : "border-line bg-raised text-muted";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium whitespace-nowrap ${tone}`}
      title={`${SESSION_LABEL[state.session]} · ${state.eastern}`}
    >
      <span
        className={`inline-block size-1.5 shrink-0 rounded-full ${state.live ? "live-dot bg-discount" : "bg-subtle"}`}
        aria-hidden
      />
      {compact ? (
        <>
          <span className="sm:hidden">{SESSION_SHORT[state.session]}</span>
          <span className="hidden sm:inline">{SESSION_LABEL[state.session]}</span>
        </>
      ) : (
        SESSION_LABEL[state.session]
      )}
    </span>
  );
}
