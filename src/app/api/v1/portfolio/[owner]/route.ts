import { getPortfolio } from "@/core/portfolio/valuation";
import { fail, ok, preflight } from "@/lib/api";

export const revalidate = 30;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(_request: Request, context: { params: Promise<{ owner: string }> }) {
  const { owner } = await context.params;

  if (!BASE58.test(owner)) {
    return fail(400, "bad_address", "That does not look like a Solana address");
  }

  try {
    const portfolio = await getPortfolio(owner);
    return ok({
      owner: portfolio.owner,
      basis: portfolio.basis,
      totalValue: Number(portfolio.totalValue.toFixed(2)),
      naiveTotal: Number(portfolio.naiveTotal.toFixed(2)),
      storedFieldTotal: Number(portfolio.storedFieldTotal.toFixed(2)),
      positions: portfolio.positions.map((p) => ({
        mint: p.mint,
        symbol: p.symbol,
        ticker: p.ticker,
        issuer: p.issuer,
        rawAmount: p.rawAmount,
        shares: Number(p.shares.toFixed(8)),
        naiveShares: Number(p.naiveShares.toFixed(8)),
        storedFieldShares: Number(p.storedFieldShares.toFixed(8)),
        sharePrice: p.sharePrice,
        value: p.value === null ? null : Number(p.value.toFixed(2)),
        naiveValue: p.naiveValue === null ? null : Number(p.naiveValue.toFixed(2)),
        multiplier: { effective: p.multiplierEffective, stored: p.multiplierStored, stale: p.multiplierStale },
      })),
    });
  } catch (error) {
    return fail(502, "upstream_error", error instanceof Error ? error.message : "lookup failed");
  }
}

export const OPTIONS = preflight;
