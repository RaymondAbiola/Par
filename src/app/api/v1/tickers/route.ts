import { getParSnapshot } from "@/core/par/engine";
import { annotate } from "@/core/par/normalize";
import { scanDislocations } from "@/core/par/scan";
import { toWireTicker } from "@/core/par/wire";
import { fail, intParam, ok, preflight } from "@/lib/api";

// the scan costs ~35s cold, so a short window guarantees most callers pay it
export const revalidate = 300;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = intParam(params.get("limit"), 25, 1, 100);
  const minLiquidity = intParam(params.get("minLiquidity"), 25_000, 0, 100_000_000);
  const explicit = params.get("tickers");

  try {
    const results = explicit
      ? await getParSnapshot(
          explicit
            .split(",")
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, limit),
        )
      : await scanDislocations({
          // scan wider than we return, or "biggest dislocations" would just mean "deepest liquidity"
          maxTickers: Math.max(limit * 4, 40),
          maxLiveQuotes: 40,
          minLiquidityUsd: minLiquidity,
        });

    return ok(results.slice(0, limit).map((par) => toWireTicker(par, annotate(par.wrappers, "buy"))));
  } catch (error) {
    return fail(502, "upstream_error", error instanceof Error ? error.message : "scan failed");
  }
}

export const OPTIONS = preflight;
