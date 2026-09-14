import { allListings, allMints } from "@/core/registry";
import { meta, ok, preflight } from "@/lib/api";

export const revalidate = 0;

export function GET() {
  return ok(
    {
      status: "ok",
      listings: allListings().length,
      wrappers: allMints().length,
      registryGeneratedAt: meta().generatedAt,
    },
    0,
  );
}

export const OPTIONS = preflight;
