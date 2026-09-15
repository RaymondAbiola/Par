import { describe, expect, it } from "vitest";
import { effectiveMultiplier, isMultiplierStale, rawToShares } from "./multiplier";

// NFLXx on mainnet: stored 1, pending 10, effective since 2025-11-16
const NFLXX = { multiplier: "1", newMultiplier: "10", newMultiplierEffectiveTimestamp: 1763337300 };
const NOW = 1789300000;

describe("effectiveMultiplier", () => {
  it("returns the pending value once its timestamp has passed", () => {
    expect(effectiveMultiplier(NFLXX, NOW)).toBe(10);
  });

  it("returns the stored value before the switch", () => {
    expect(effectiveMultiplier(NFLXX, 1763337299)).toBe(1);
  });

  it("switches exactly on the timestamp", () => {
    expect(effectiveMultiplier(NFLXX, 1763337300)).toBe(10);
  });

  it("accepts numbers as well as strings", () => {
    expect(effectiveMultiplier({ multiplier: 1, newMultiplier: 10, newMultiplierEffectiveTimestamp: 0 }, NOW)).toBe(10);
  });

  it("falls back to the stored value when the schedule is unreadable", () => {
    expect(effectiveMultiplier({ multiplier: "2", newMultiplier: "oops", newMultiplierEffectiveTimestamp: 0 }, NOW)).toBe(2);
  });

  it("falls back to 1 when nothing is readable", () => {
    expect(effectiveMultiplier({ multiplier: "x", newMultiplier: "y", newMultiplierEffectiveTimestamp: "z" }, NOW)).toBe(1);
  });
});

describe("isMultiplierStale", () => {
  it("flags a mint whose stored field is behind", () => {
    expect(isMultiplierStale(NFLXX, NOW)).toBe(true);
  });

  it("does not flag one that is current", () => {
    expect(isMultiplierStale({ multiplier: "1", newMultiplier: "1", newMultiplierEffectiveTimestamp: 0 }, NOW)).toBe(false);
  });
});

describe("rawToShares", () => {
  // the largest NFLXx account; the RPC reports uiAmount 1496838.6614631
  it("reproduces the RPC's uiAmount", () => {
    expect(rawToShares(14_968_386_614_631n, 8, 10)).toBeCloseTo(1_496_838.6614631, 4);
  });

  it("is ten times under without the multiplier", () => {
    expect(rawToShares(14_968_386_614_631n, 8, 1)).toBeCloseTo(149_683.86614631, 4);
  });

  it("accepts a string amount", () => {
    expect(rawToShares("100000000", 8, 10)).toBe(10);
  });

  it("keeps fractional dust", () => {
    expect(rawToShares(1n, 8, 1)).toBeCloseTo(1e-8, 12);
  });
});
