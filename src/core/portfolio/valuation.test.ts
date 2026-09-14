import { describe, expect, it } from "vitest";
import { errorPct } from "@/core/portfolio/valuation";
import { rawToShares } from "@/core/solana/multiplier";

/**
 * Numbers from the largest NFLXx account on mainnet: raw 14968386614631 at 8 decimals,
 * stored multiplier 1.0, effective 10.0. The RPC reports uiAmount 1496838.6614631.
 */
const RAW = 14_968_386_614_631n;
const DECIMALS = 8;
const STORED = 1;
const EFFECTIVE = 10;
const RPC_UI_AMOUNT = 1_496_838.6614631;

describe("valuing a rebased position", () => {
  it("matches the RPC's uiAmount when the effective multiplier is applied", () => {
    expect(rawToShares(RAW, DECIMALS, EFFECTIVE)).toBeCloseTo(RPC_UI_AMOUNT, 4);
  });

  it("understates by 10x when raw amount is converted without the multiplier", () => {
    const naive = rawToShares(RAW, DECIMALS, 1);
    expect(naive).toBeCloseTo(149_683.86614631, 4);
    expect(RPC_UI_AMOUNT / naive).toBeCloseTo(10, 6);
  });

  // the mint's stored field still reads 1.0, so trusting it is as wrong as ignoring it
  it("is equally wrong when the stale stored field is used", () => {
    expect(rawToShares(RAW, DECIMALS, STORED)).toBeCloseTo(rawToShares(RAW, DECIMALS, 1), 6);
  });

  it("leaves an unrebased position alone", () => {
    expect(rawToShares(100_000_000n, DECIMALS, 1)).toBe(1);
  });
});

describe("errorPct", () => {
  it("reports a tenfold understatement as -90%", () => {
    expect(errorPct(149_683.87, 1_496_838.66)).toBeCloseTo(-90, 1);
  });

  it("reports an overstatement as positive", () => {
    expect(errorPct(110, 100)).toBeCloseTo(10, 6);
  });

  it("is zero when correct", () => {
    expect(errorPct(100, 100)).toBe(0);
  });

  it("is null against a zero holding", () => {
    expect(errorPct(0, 0)).toBeNull();
  });
});
