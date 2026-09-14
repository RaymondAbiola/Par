import { getTickerPar } from "@/core/par/engine";
import { toWireTicker, toWireWrapper } from "@/core/par/wire";
import { getByMint } from "@/core/registry";
import { fail, ok, preflight } from "@/lib/api";

export const revalidate = 30;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  const { mint } = await context.params;

  const entry = getByMint(mint);
  if (!entry) return fail(404, "unknown_mint", `${mint} is not a known tokenized equity`);

  try {
    const par = await getTickerPar(entry.listing.ticker);
    const wrapper = par?.wrappers.find((w) => w.mint === mint);
    if (!par || !wrapper) return fail(502, "upstream_error", "Could not price this mint");

    return ok({
      ...toWireWrapper(wrapper),
      underlying: { ...toWireTicker(par), wrappers: undefined },
    });
  } catch (error) {
    return fail(502, "upstream_error", error instanceof Error ? error.message : "lookup failed");
  }
}

export const OPTIONS = preflight;
