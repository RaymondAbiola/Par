import { describe, expect, it } from "vitest";
import { annotate, chooseVenue, exclusionReason, savingUsd } from "@/core/par/normalize";
import type { TickerPar, WrapperPar } from "@/core/par/engine";

function wrapper(partial: Partial<WrapperPar> & Pick<WrapperPar, "symbol">): WrapperPar {
  return {
    mint: partial.symbol,
    issuer: "xstocks",
    decimals: 8,
    pricePerShare: 100,
    premiumBps: 0,
    liquidityUsd: 1_000_000,
    volume24hUsd: null,
    holders: null,
    multiplier: null,
    execution: null,
    ...partial,
  };
}

describe("exclusionReason", () => {
  it("passes a deep, priced wrapper", () => {
    expect(exclusionReason(wrapper({ symbol: "OK" }))).toBeNull();
  });

  it("flags a missing price first", () => {
    expect(exclusionReason(wrapper({ symbol: "X", pricePerShare: null, liquidityUsd: 1 }))).toBe("no-price");
  });

  it("flags a measured failure to route", () => {
    const w = wrapper({
      symbol: "X",
      execution: { sizeUsd: 1000, side: "buy", routable: false, slippageBps: null, allInBps: null, tradeableWithin50Bps: 0 },
    });
    expect(exclusionReason(w)).toBe("unroutable");
  });

  it("flags dust liquidity when depth was not measured", () => {
    expect(exclusionReason(wrapper({ symbol: "CRCLon", liquidityUsd: 224 }))).toBe("thin-liquidity");
  });
});

describe("annotate", () => {
  it("ranks from one and marks exclusions", () => {
    const ranked = annotate(
      [wrapper({ symbol: "CRCLon", premiumBps: -289, liquidityUsd: 224 }), wrapper({ symbol: "CRCLx", premiumBps: 74 })],
      "buy",
    );
    expect(ranked.map((w) => [w.symbol, w.rank, w.recommendable])).toEqual([
      ["CRCLx", 1, true],
      ["CRCLon", 2, false],
    ]);
    expect(ranked[1]?.excludedBecause).toBe("thin-liquidity");
  });
});

describe("savingUsd", () => {
  it("prices a 300bp edge on a ten thousand dollar buy", () => {
    const cheap = wrapper({ symbol: "A", premiumBps: -100 });
    const dear = wrapper({ symbol: "B", premiumBps: 200 });
    expect(savingUsd(cheap, dear, 10_000, "buy")).toBeCloseTo(300, 6);
  });

  it("flips with side", () => {
    const a = wrapper({ symbol: "A", premiumBps: -100 });
    const b = wrapper({ symbol: "B", premiumBps: 200 });
    expect(savingUsd(a, b, 10_000, "sell")).toBeCloseTo(-300, 6);
  });

  it("prefers measured execution cost over the headline", () => {
    const measured = wrapper({
      symbol: "A",
      premiumBps: -100,
      execution: { sizeUsd: 10_000, side: "buy", routable: true, slippageBps: 500, allInBps: 400, tradeableWithin50Bps: 0 },
    });
    const headline = wrapper({ symbol: "B", premiumBps: 200 });
    expect(savingUsd(measured, headline, 10_000, "buy")).toBeCloseTo(-200, 6);
  });

  it("is null when a cost is unknown", () => {
    expect(savingUsd(wrapper({ symbol: "A", premiumBps: null }), wrapper({ symbol: "B" }), 10_000, "buy")).toBeNull();
  });
});

describe("chooseVenue", () => {
  const par = (wrappers: WrapperPar[]): TickerPar => ({
    ticker: "CRCL",
    name: "Circle",
    instrument: "stock",
    reference: null,
    wrappers,
    spreadBps: null,
  });

  it("picks the tradeable wrapper and prices the edge", () => {
    const choice = chooseVenue(
      par([
        wrapper({ symbol: "CRCLon", premiumBps: -289, liquidityUsd: 224 }),
        wrapper({ symbol: "CRCLx", premiumBps: 74 }),
      ]),
      10_000,
      "buy",
    );
    expect(choice.best?.symbol).toBe("CRCLx");
    // the dust wrapper is not a real alternative, so there is nothing to compare against
    expect(choice.savingUsd).toBeNull();
  });

  it("quantifies the edge when both are tradeable", () => {
    const choice = chooseVenue(
      par([wrapper({ symbol: "A", premiumBps: 200 }), wrapper({ symbol: "B", premiumBps: -100 })]),
      10_000,
      "buy",
    );
    expect(choice.best?.symbol).toBe("B");
    expect(choice.savingUsd).toBeCloseTo(300, 6);
  });

  it("returns no best when nothing is tradeable", () => {
    const choice = chooseVenue(
      par([wrapper({ symbol: "A", liquidityUsd: 10 }), wrapper({ symbol: "B", liquidityUsd: 20 })]),
      10_000,
      "buy",
    );
    expect(choice.best).toBeNull();
    expect(choice.candidates.every((c) => !c.recommendable)).toBe(true);
  });
});
