"use client";

import { useEffect, useState } from "react";
import { getSession, SESSION_LABEL, type SessionState } from "@/core/prices/session";
import { Badge } from "@/components/ui/badge";

/**
 * Computed on the client and only after mount. The session changes while a page is cached, so
 * rendering it on the server would either freeze it at build time or mismatch on hydration.
 */
export function SessionBadge() {
  const [state, setState] = useState<SessionState | null>(null);

  useEffect(() => {
    const tick = () => setState(getSession());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!state) return <span className="h-5 w-24 rounded bg-raised" aria-hidden />;

  return (
    <Badge tone={state.live ? "discount" : "neutral"}>
      <span
        className={`inline-block size-1.5 rounded-full ${state.live ? "bg-discount" : "bg-subtle"}`}
        aria-hidden
      />
      {SESSION_LABEL[state.session]}
    </Badge>
  );
}
