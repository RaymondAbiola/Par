/**
 * The Token-2022 scaled-UI config, as the RPC returns it under
 * `extensions[].state` for `scaledUiAmountConfig`.
 */
export interface ScaledUiAmountConfig {
  multiplier: string | number;
  newMultiplier: string | number;
  newMultiplierEffectiveTimestamp: string | number;
}

/**
 * The multiplier actually in force.
 *
 * The mint stores a current multiplier alongside a scheduled replacement. Once that
 * replacement's timestamp has passed, the stored `multiplier` is simply out of date and
 * `newMultiplier` is live. On Solana mainnet this is not a corner case: at the time of
 * writing 105 of 656 tokenized-equity wrappers store a value that is no longer correct,
 * and for NFLXx the stored field reads 1 while the real multiplier has been 10 since
 * November 2025.
 */
export function effectiveMultiplier(
  config: ScaledUiAmountConfig,
  atUnixSeconds: number = Math.floor(Date.now() / 1000),
): number {
  const stored = Number(config.multiplier);
  const pending = Number(config.newMultiplier);
  const effectiveFrom = Number(config.newMultiplierEffectiveTimestamp);

  if (!Number.isFinite(stored)) return 1;
  if (!Number.isFinite(pending) || !Number.isFinite(effectiveFrom)) return stored;

  return atUnixSeconds >= effectiveFrom ? pending : stored;
}

/**
 * Raw token units to share-equivalents. Use this wherever you touch the raw `amount`:
 * swap routing, pool maths, your own accounting. The RPC's `uiAmount` already applies
 * the multiplier, so if you are reading that, you do not need this.
 */
export function rawToShares(
  rawAmount: bigint | string | number,
  decimals: number,
  multiplier: number,
): number {
  const raw = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
  const scale = 10n ** BigInt(decimals);

  // split so the integer part stays exact on large balances
  const whole = Number(raw / scale);
  const fraction = Number(raw % scale) / Number(scale);
  return (whole + fraction) * multiplier;
}

/** True when the stored field would give the wrong answer right now. */
export function isMultiplierStale(
  config: ScaledUiAmountConfig,
  atUnixSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  return effectiveMultiplier(config, atUnixSeconds) !== Number(config.multiplier);
}
