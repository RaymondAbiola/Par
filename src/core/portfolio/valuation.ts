import { getReferencePrices } from "@/core/prices/reference";
import { getByMint } from "@/core/registry";
import { rpc } from "@/core/solana/rpc";
import { fetchMultipliers, rawToShares } from "@/core/solana/multiplier";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export interface Position {
  mint: string;
  symbol: string;
  ticker: string;
  issuer: string;
  decimals: number;

  /** Raw on-chain amount, exactly as stored. */
  rawAmount: string;

  /** Share-equivalents using the multiplier actually in force. This is the true holding. */
  shares: number;
  /** What raw/10^decimals gives you, ignoring the multiplier entirely. */
  naiveShares: number;
  /** What the mint's stored multiplier field gives you, which is stale on many mints. */
  storedFieldShares: number;

  sharePrice: number | null;
  value: number | null;
  naiveValue: number | null;
  storedFieldValue: number | null;

  multiplierEffective: number;
  multiplierStored: number;
  multiplierStale: boolean;
}

export interface Portfolio {
  owner: string;
  positions: Position[];
  totalValue: number;
  /** Total if raw amounts were converted without the multiplier: what on-chain math gets wrong. */
  naiveTotal: number;
  /** Total using the mint's stored multiplier field. */
  storedFieldTotal: number;
  basis: string | null;
}

interface RawAccount {
  account?: {
    data?: {
      parsed?: {
        info?: { mint?: string; tokenAmount?: { amount?: string; decimals?: number } };
      };
    };
  };
}

export async function getPortfolio(owner: string): Promise<Portfolio> {
  const accounts = await rpc<{ value: RawAccount[] }>("getTokenAccountsByOwner", [
    owner,
    { programId: TOKEN_2022 },
    { encoding: "jsonParsed" },
  ]);

  const held = accounts.value.flatMap((a) => {
    const info = a.account?.data?.parsed?.info;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.amount;
    const decimals = info?.tokenAmount?.decimals;
    if (!mint || !amount || decimals === undefined || amount === "0") return [];

    const entry = getByMint(mint);
    return entry ? [{ mint, amount, decimals, entry }] : [];
  });

  if (held.length === 0) {
    return { owner, positions: [], totalValue: 0, naiveTotal: 0, storedFieldTotal: 0, basis: null };
  }

  const tickers = [...new Set(held.map((h) => h.entry.listing.ticker))];
  const [multipliers, references] = await Promise.all([
    fetchMultipliers(held.map((h) => h.mint)),
    getReferencePrices(tickers),
  ]);

  const positions: Position[] = held.map((h) => {
    const state = multipliers.get(h.mint);
    const effective = state?.effective ?? 1;
    const stored = state?.stored ?? 1;
    const raw = BigInt(h.amount);

    const shares = rawToShares(raw, h.decimals, effective);
    const naiveShares = rawToShares(raw, h.decimals, 1);
    const storedFieldShares = rawToShares(raw, h.decimals, stored);
    const sharePrice = references.get(h.entry.listing.ticker)?.price ?? null;

    return {
      mint: h.mint,
      symbol: h.entry.wrapper.symbol,
      ticker: h.entry.listing.ticker,
      issuer: h.entry.wrapper.issuer,
      decimals: h.decimals,
      rawAmount: h.amount,
      shares,
      naiveShares,
      storedFieldShares,
      sharePrice,
      value: sharePrice === null ? null : shares * sharePrice,
      naiveValue: sharePrice === null ? null : naiveShares * sharePrice,
      storedFieldValue: sharePrice === null ? null : storedFieldShares * sharePrice,
      multiplierEffective: effective,
      multiplierStored: stored,
      multiplierStale: state?.stale ?? false,
    };
  });

  const sum = (pick: (p: Position) => number | null) =>
    positions.reduce((n, p) => n + (pick(p) ?? 0), 0);

  return {
    owner,
    positions: positions.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    totalValue: sum((p) => p.value),
    naiveTotal: sum((p) => p.naiveValue),
    storedFieldTotal: sum((p) => p.storedFieldValue),
    basis: references.get(tickers[0] ?? "")?.basis ?? null,
  };
}

/** How far off a valuation is, in percent. Negative means it understates the holding. */
export function errorPct(wrong: number, correct: number): number | null {
  if (correct === 0) return null;
  return ((wrong - correct) / correct) * 100;
}
