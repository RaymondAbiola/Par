import { allListings } from "@/core/registry";
import { rpc } from "@/core/solana/rpc";
import { fetchMultipliers, rawToShares } from "@/core/solana/multiplier";

export interface StaleExample {
  mint: string;
  symbol: string;
  ticker: string;
  decimals: number;
  stored: number;
  effective: number;
  effectiveFrom: string | null;
  /** A real account holding this mint, so the numbers are not hypothetical. */
  account: string;
  rawAmount: string;
  /** Applying the effective multiplier. Matches what the RPC reports as uiAmount. */
  correctShares: number;
  /** raw / 10^decimals, the obvious conversion. */
  naiveShares: number;
  /** Using the mint's own stored multiplier field. */
  storedFieldShares: number;
  /** What the RPC itself says, as an independent check on our arithmetic. */
  rpcUiAmount: number | null;
  factor: number;
}

/** The live worked example the checker leads with: worst stale multiplier, on a real account. */
export async function getStaleExample(): Promise<StaleExample | null> {
  const wrappers = allListings().flatMap((l) =>
    l.wrappers.map((w) => ({ ticker: l.ticker, symbol: w.symbol, mint: w.mint, decimals: w.decimals })),
  );

  const states = await fetchMultipliers(wrappers.map((w) => w.mint));

  const worst = wrappers
    .flatMap((w) => {
      const s = states.get(w.mint);
      return s?.stale ? [{ ...w, state: s }] : [];
    })
    .sort((a, b) => Math.abs(b.state.naiveErrorBps) - Math.abs(a.state.naiveErrorBps))[0];

  if (!worst) return null;

  const largest = await rpc<{ value: { address: string; amount: string; uiAmount: number | null }[] }>(
    "getTokenLargestAccounts",
    [worst.mint],
  );
  const account = largest.value.find((a) => a.amount !== "0");
  if (!account) return null;

  const raw = BigInt(account.amount);
  const { stored, effective } = worst.state;

  return {
    mint: worst.mint,
    symbol: worst.symbol,
    ticker: worst.ticker,
    decimals: worst.decimals,
    stored,
    effective,
    effectiveFrom: worst.state.effectiveFrom
      ? new Date(worst.state.effectiveFrom * 1000).toISOString()
      : null,
    account: account.address,
    rawAmount: account.amount,
    correctShares: rawToShares(raw, worst.decimals, effective),
    naiveShares: rawToShares(raw, worst.decimals, 1),
    storedFieldShares: rawToShares(raw, worst.decimals, stored),
    rpcUiAmount: account.uiAmount,
    factor: stored === 0 ? 1 : effective / stored,
  };
}
