import { getParsedMints, type ParsedMint } from "@/core/solana/rpc";

export interface ScaledUiConfig {
  /** The extension's `multiplier` field, verbatim. */
  stored: number;
  /** The scheduled replacement. */
  pending: number;
  /** Unix seconds at which `pending` takes over. */
  effectiveFrom: number;
}

export interface MultiplierState {
  mint: string;
  decimals: number;
  stored: number;
  /** The multiplier actually in force. This is the only one worth valuing a position with. */
  effective: number;
  pending: number;
  effectiveFrom: number;
  /** True when the stored field no longer matches reality. */
  stale: boolean;
  /** What a naive read of the stored field costs you, in basis points. */
  naiveErrorBps: number;
}

const NO_SCALING: ScaledUiConfig = { stored: 1, pending: 1, effectiveFrom: 0 };

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

export function parseScaledUiConfig(mint: ParsedMint): ScaledUiConfig {
  const extension = mint.extensions?.find((e) => e.extension === "scaledUiAmountConfig");
  if (!extension) return NO_SCALING;

  const stored = toNumber(extension.state.multiplier, 1);
  return {
    stored,
    pending: toNumber(extension.state.newMultiplier, stored),
    effectiveFrom: toNumber(extension.state.newMultiplierEffectiveTimestamp, 0),
  };
}

/**
 * The whole point of this module. Token-2022 stores the current multiplier alongside a scheduled
 * replacement; once its timestamp passes, the stored field is simply wrong and the pending one is
 * live. NFLXx has read 1 while actually being 10 since November 2025.
 */
export function resolveMultiplier(config: ScaledUiConfig, atUnixSeconds: number): number {
  return atUnixSeconds >= config.effectiveFrom ? config.pending : config.stored;
}

export function toMultiplierState(
  mint: string,
  decimals: number,
  config: ScaledUiConfig,
  atUnixSeconds: number,
): MultiplierState {
  const effective = resolveMultiplier(config, atUnixSeconds);
  const stale = effective !== config.stored;

  return {
    mint,
    decimals,
    stored: config.stored,
    effective,
    pending: config.pending,
    effectiveFrom: config.effectiveFrom,
    stale,
    naiveErrorBps: config.stored === 0 ? 0 : ((effective - config.stored) / config.stored) * 10_000,
  };
}

/** Raw token units to share-equivalents. Split to keep the integer part exact. */
export function rawToShares(raw: bigint, decimals: number, multiplier: number): number {
  const scale = 10n ** BigInt(decimals);
  const whole = Number(raw / scale);
  const fraction = Number(raw % scale) / Number(scale);
  return (whole + fraction) * multiplier;
}

export function sharesToRaw(shares: number, decimals: number, multiplier: number): bigint {
  if (multiplier === 0) return 0n;
  return BigInt(Math.round((shares / multiplier) * 10 ** decimals));
}

export async function fetchMultipliers(
  mints: readonly string[],
  atUnixSeconds = Math.floor(Date.now() / 1000),
): Promise<Map<string, MultiplierState>> {
  const parsed = await getParsedMints(mints);
  const out = new Map<string, MultiplierState>();

  for (const [mint, info] of parsed) {
    out.set(mint, toMultiplierState(mint, info.decimals, parseScaledUiConfig(info), atUnixSeconds));
  }

  return out;
}
