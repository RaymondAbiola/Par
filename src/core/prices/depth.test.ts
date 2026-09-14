import { describe, expect, it } from "vitest";
import {
  effectiveBuyPrice,
  effectiveSellPrice,
  slippageBps,
  tradeableWithin,
  type DepthProfile,
} from "@/core/prices/depth";

describe("effectiveBuyPrice", () => {
  // NVDAx: 8 decimals, multiplier ~1.0017, ~$215.66/share
  it("prices a normal buy", () => {
    const out = 46_370_000_000n; // ~463.7 raw tokens
    const price = effectiveBuyPrice(100_000, out, 8, 1.001701196801074);
    expect(price).toBeCloseTo(215.4, 0);
  });

  /**
   * The trap: ignoring the multiplier on a 10x-rebased token overstates the price tenfold.
   * NFLXx trades near $75/share but one raw token is ten shares.
   */
  it("does not mistake raw tokens for shares on a rebased mint", () => {
    const out = 1_000_000_000n; // 10 raw NFLXx
    const correct = effectiveBuyPrice(7_511, out, 8, 10);
    const naive = effectiveBuyPrice(7_511, out, 8, 1);
    expect(correct).toBeCloseTo(75.11, 2);
    expect(naive).toBeCloseTo(751.1, 1);
    expect(naive! / correct!).toBeCloseTo(10, 6);
  });

  it("returns null when nothing comes back", () => {
    expect(effectiveBuyPrice(1_000, 0n, 8, 1)).toBeNull();
  });
});

describe("effectiveSellPrice", () => {
  it("prices a sell from usdc proceeds", () => {
    expect(effectiveSellPrice(10, 751_130_000n)).toBeCloseTo(75.113, 3);
  });

  it("returns null on zero shares", () => {
    expect(effectiveSellPrice(0, 100n)).toBeNull();
  });
});

describe("slippageBps", () => {
  it("counts paying above reference as positive on a buy", () => {
    expect(slippageBps(101, 100, "buy")).toBeCloseTo(100, 6);
  });

  it("counts receiving below reference as positive on a sell", () => {
    expect(slippageBps(99, 100, "sell")).toBeCloseTo(100, 6);
  });

  it("counts price improvement as negative", () => {
    expect(slippageBps(99, 100, "buy")).toBeCloseTo(-100, 6);
  });

  it("is zero at the reference", () => {
    expect(slippageBps(100, 100, "buy")).toBe(0);
  });
});

describe("tradeableWithin", () => {
  const profile: DepthProfile = {
    mint: "Xsc9qv",
    referencePricePerShare: 215.66,
    rungs: [
      { sizeUsd: 1_000, side: "buy", effectivePricePerShare: 215.7, slippageBps: 12, priceImpactPct: null },
      { sizeUsd: 10_000, side: "buy", effectivePricePerShare: 216.2, slippageBps: 45, priceImpactPct: null },
      { sizeUsd: 50_000, side: "buy", effectivePricePerShare: 220.0, slippageBps: 320, priceImpactPct: null },
      { sizeUsd: 10_000, side: "sell", effectivePricePerShare: 215.0, slippageBps: 30, priceImpactPct: null },
    ],
    attempted: [1_000, 10_000, 50_000],
    unroutable: false,
  };

  it("finds the largest size inside the budget", () => {
    expect(tradeableWithin(profile, 50, "buy")).toBe(10_000);
  });

  it("widens with the budget", () => {
    expect(tradeableWithin(profile, 400, "buy")).toBe(50_000);
  });

  it("returns zero when even the smallest rung is too costly", () => {
    expect(tradeableWithin(profile, 5, "buy")).toBe(0);
  });

  it("keeps the sides separate", () => {
    expect(tradeableWithin(profile, 50, "sell")).toBe(10_000);
  });
});
