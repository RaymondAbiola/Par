import { describe, expect, it } from "vitest";
import {
  parseScaledUiConfig,
  rawToShares,
  resolveMultiplier,
  sharesToRaw,
  toMultiplierState,
  type ScaledUiConfig,
} from "@/core/solana/multiplier";
import type { ParsedMint } from "@/core/solana/rpc";

// observed on mainnet 2026-09-14
const NFLXX: ScaledUiConfig = { stored: 1, pending: 10, effectiveFrom: 1763337300 };
const NVDAX: ScaledUiConfig = {
  stored: 1.0009180758490996,
  pending: 1.001701196801074,
  effectiveFrom: 1789000200,
};
const TSLAX: ScaledUiConfig = { stored: 1, pending: 1, effectiveFrom: 0 };

const NOW = 1789300000; // after both effective timestamps

describe("resolveMultiplier", () => {
  it("uses the pending multiplier once its timestamp has passed", () => {
    expect(resolveMultiplier(NFLXX, NOW)).toBe(10);
  });

  it("uses the stored multiplier before the switch", () => {
    expect(resolveMultiplier(NFLXX, NFLXX.effectiveFrom - 1)).toBe(1);
  });

  it("switches exactly at the effective timestamp", () => {
    expect(resolveMultiplier(NFLXX, NFLXX.effectiveFrom)).toBe(10);
  });

  it("leaves un-rebased tokens alone", () => {
    expect(resolveMultiplier(TSLAX, NOW)).toBe(1);
  });
});

describe("toMultiplierState", () => {
  it("flags the netflix split and prices the naive error at 10x", () => {
    const state = toMultiplierState("XsEH7w", 8, NFLXX, NOW);
    expect(state.effective).toBe(10);
    expect(state.stale).toBe(true);
    expect(state.naiveErrorBps).toBe(90_000);
  });

  it("flags nvidia's dividend accrual as a small but real error", () => {
    const state = toMultiplierState("Xsc9qv", 8, NVDAX, NOW);
    expect(state.stale).toBe(true);
    expect(state.naiveErrorBps).toBeCloseTo(7.82, 1);
  });

  it("does not flag a token with no pending change", () => {
    expect(toMultiplierState("XsDoVf", 8, TSLAX, NOW).stale).toBe(false);
  });

  it("does not flag a pending change that has not landed yet", () => {
    const state = toMultiplierState("Xsc9qv", 8, NVDAX, NVDAX.effectiveFrom - 1);
    expect(state.stale).toBe(false);
    expect(state.effective).toBe(NVDAX.stored);
  });
});

describe("parseScaledUiConfig", () => {
  it("reads the extension off a parsed mint", () => {
    const mint: ParsedMint = {
      decimals: 8,
      supply: "1",
      extensions: [
        {
          extension: "scaledUiAmountConfig",
          state: { multiplier: "1", newMultiplier: "10", newMultiplierEffectiveTimestamp: 1763337300 },
        },
      ],
    };
    expect(parseScaledUiConfig(mint)).toEqual(NFLXX);
  });

  it("defaults to no scaling when the extension is absent", () => {
    expect(parseScaledUiConfig({ decimals: 6, supply: "1" })).toEqual({
      stored: 1,
      pending: 1,
      effectiveFrom: 0,
    });
  });
});

describe("rawToShares", () => {
  it("applies the multiplier, not just the decimals", () => {
    // one raw NFLXx really is ten shares
    expect(rawToShares(100_000_000n, 8, 10)).toBe(10);
  });

  it("matches the naive answer when there is no scaling", () => {
    expect(rawToShares(100_000_000n, 8, 1)).toBe(1);
  });

  // NVDAx supply: applying the effective multiplier reproduces Jupiter's circulating supply exactly
  it("keeps precision on large balances", () => {
    expect(rawToShares(32_127_967_216_242n, 8, 1.001701196801074)).toBe(321826.23211295286);
  });

  it("handles fractional dust", () => {
    expect(rawToShares(1n, 8, 1)).toBeCloseTo(1e-8, 12);
  });

  it("round-trips through sharesToRaw", () => {
    expect(sharesToRaw(rawToShares(100_000_000n, 8, 10), 8, 10)).toBe(100_000_000n);
  });
});
