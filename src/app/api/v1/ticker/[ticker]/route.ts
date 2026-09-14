import { getTickerPar } from "@/core/par/engine";
import { annotate, chooseVenue } from "@/core/par/normalize";
import { toWireTicker } from "@/core/par/wire";
import type { Side } from "@/core/prices/depth";
import { fail, intParam, ok, preflight } from "@/lib/api";

export const revalidate = 30;

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const params = new URL(request.url).searchParams;

  const side: Side = params.get("side") === "sell" ? "sell" : "buy";
  const sizeParam = params.get("size");
  const sizeUsd = sizeParam === null ? null : intParam(sizeParam, 10_000, 1, 10_000_000);

  try {
    // a size means measure real depth, which costs a quote per wrapper
    const par = await getTickerPar(ticker, sizeUsd ? { depth: { sizeUsd, side } } : {});
    if (!par) return fail(404, "unknown_ticker", `No tokenized wrapper found for ${ticker}`);

    if (sizeUsd === null) {
      return ok(toWireTicker(par, annotate(par.wrappers, side)));
    }

    const choice = chooseVenue(par, sizeUsd, side);
    return ok({
      ...toWireTicker(par, choice.candidates),
      decision: {
        sizeUsd,
        side,
        best: choice.best?.symbol ?? null,
        savingUsd: choice.savingUsd === null ? null : Number(choice.savingUsd.toFixed(2)),
        maxSavingUsd: choice.maxSavingUsd === null ? null : Number(choice.maxSavingUsd.toFixed(2)),
      },
    });
  } catch (error) {
    return fail(502, "upstream_error", error instanceof Error ? error.message : "lookup failed");
  }
}

export const OPTIONS = preflight;
