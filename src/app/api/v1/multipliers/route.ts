import { allListings } from "@/core/registry";
import { fetchMultipliers } from "@/core/solana/multiplier";
import { fail, intParam, ok, preflight } from "@/lib/api";

export const revalidate = 300;

/**
 * The correctness endpoint: every wrapper whose stored scaled-UI multiplier no longer matches the
 * one actually in force, worst error first.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = intParam(params.get("limit"), 100, 1, 1000);
  const staleOnly = params.get("staleOnly") !== "false";

  const wrappers = allListings().flatMap((l) =>
    l.wrappers.map((w) => ({ ticker: l.ticker, symbol: w.symbol, issuer: w.issuer, mint: w.mint })),
  );

  try {
    const states = await fetchMultipliers(wrappers.map((w) => w.mint));

    const rows = wrappers
      .flatMap((w) => {
        const state = states.get(w.mint);
        if (!state) return [];
        if (staleOnly && !state.stale) return [];
        return [
          {
            ...w,
            stored: state.stored,
            effective: state.effective,
            stale: state.stale,
            naiveErrorBps: Number(state.naiveErrorBps.toFixed(2)),
            naiveErrorFactor: state.stored === 0 ? null : Number((state.effective / state.stored).toFixed(6)),
            effectiveFrom: state.effectiveFrom ? new Date(state.effectiveFrom * 1000).toISOString() : null,
          },
        ];
      })
      .sort((a, b) => Math.abs(b.naiveErrorBps) - Math.abs(a.naiveErrorBps))
      .slice(0, limit);

    return ok({
      scanned: states.size,
      stale: [...states.values()].filter((s) => s.stale).length,
      rebasing: [...states.values()].filter((s) => s.effective !== 1).length,
      rows,
    });
  } catch (error) {
    return fail(502, "upstream_error", error instanceof Error ? error.message : "scan failed");
  }
}

export const OPTIONS = preflight;
