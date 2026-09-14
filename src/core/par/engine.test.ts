import { describe, expect, it } from "vitest";
import {
  allInBps,
  isRecommendable,
  premiumBps,
  rankWrappers,
  spreadBps,
  type WrapperPar,
} from "@/core/par/engine";

function wrapper(partial: Partial<WrapperPar> & Pick<WrapperPar, "symbol">): WrapperPar {
  return {
    mint: partial.symbol,
    issuer: "xstocks",
    decimals: 8,
    pricePerShare: null,
    premiumBps: null,
    liquidityUsd: null,
    volume24hUsd: null,
    holders: null,
    multiplier: null,
    execution: null,
    ...partial,
  };
}

describe("premiumBps", () => {
  // NVDAx at 213.80 against a 218.29 share price
  it("reports a discount as negative", () => {
    expect(premiumBps(213.8, 218.29)).toBeCloseTo(-205.7, 0);
  });

  it("reports a premium as positive", () => {
    expect(premiumBps(826.74, 764.29)).toBeCloseTo(817.1, 0);
  });

  it("is zero at par", () => {
    expect(premiumBps(100, 100)).toBe(0);
  });

  it("is null without a price", () => {
    expect(premiumBps(null, 218.29)).toBeNull();
  });

  it("is null without a reference", () => {
    expect(premiumBps(213.8, null)).toBeNull();
  });

  it("refuses a nonsensical reference", () => {
    expect(premiumBps(213.8, 0)).toBeNull();
  });
});

describe("allInBps", () => {
  it("adds a premium to a buyer's cost", () => {
    expect(allInBps(100, 20, "buy")).toBe(120);
  });

  // the sign flip that matters: selling into a premium is a gain, not a cost
  it("credits a seller for a premium", () => {
    expect(allInBps(100, 20, "sell")).toBe(-80);
  });

  it("charges a seller for a discount", () => {
    expect(allInBps(-100, 20, "sell")).toBe(120);
  });

  it("treats a discount as a buyer's gain", () => {
    expect(allInBps(-100, 20, "buy")).toBe(-80);
  });

  it("tolerates missing slippage", () => {
    expect(allInBps(100, null, "buy")).toBe(100);
  });

  it("is null without a premium", () => {
    expect(allInBps(null, 20, "buy")).toBeNull();
  });
});

describe("spreadBps", () => {
  it("measures the cross-issuer gap", () => {
    const gap = spreadBps([
      wrapper({ symbol: "AMDx", premiumBps: -448 }),
      wrapper({ symbol: "AMDon", premiumBps: -153 }),
    ]);
    expect(gap).toBeCloseTo(295, 0);
  });

  it("is null with a single wrapper", () => {
    expect(spreadBps([wrapper({ symbol: "TSLAx", premiumBps: -59 })])).toBeNull();
  });

  it("is null when prices are missing", () => {
    expect(spreadBps([wrapper({ symbol: "A" }), wrapper({ symbol: "B" })])).toBeNull();
  });
});

describe("rankWrappers", () => {
  /**
   * The AMD case from mainnet. AMDon shows the better headline price but cannot be routed at all,
   * so ranking on displayed premium alone would recommend the untradeable one.
   */
  it("puts an unroutable wrapper last despite a better headline price", () => {
    const amdon = wrapper({
      symbol: "AMDon",
      premiumBps: -153,
      execution: { sizeUsd: 1000, side: "buy", routable: false, slippageBps: null, allInBps: null, tradeableWithin50Bps: 0 },
    });
    const amdx = wrapper({
      symbol: "AMDx",
      premiumBps: -448,
      execution: { sizeUsd: 1000, side: "buy", routable: true, slippageBps: 1403, allInBps: 955, tradeableWithin50Bps: 0 },
    });

    expect(rankWrappers([amdon, amdx], "buy").map((w) => w.symbol)).toEqual(["AMDx", "AMDon"]);
  });

  it("prefers the cheaper all-in cost when both are routable", () => {
    const cheap = wrapper({
      symbol: "NVDAx",
      premiumBps: -206,
      execution: { sizeUsd: 10000, side: "buy", routable: true, slippageBps: 11, allInBps: -195, tradeableWithin50Bps: 50000 },
    });
    const dear = wrapper({
      symbol: "NVDAon",
      premiumBps: -190,
      execution: { sizeUsd: 10000, side: "buy", routable: true, slippageBps: 300, allInBps: 110, tradeableWithin50Bps: 0 },
    });

    expect(rankWrappers([dear, cheap], "buy").map((w) => w.symbol)).toEqual(["NVDAx", "NVDAon"]);
  });

  it("falls back to displayed premium when depth was never measured", () => {
    const a = wrapper({ symbol: "A", premiumBps: 50, liquidityUsd: 1e6 });
    const b = wrapper({ symbol: "B", premiumBps: -50, liquidityUsd: 1e6 });
    expect(rankWrappers([a, b], "buy").map((w) => w.symbol)).toEqual(["B", "A"]);
  });

  it("inverts that preference for a seller", () => {
    const a = wrapper({ symbol: "A", premiumBps: 50, liquidityUsd: 1e6 });
    const b = wrapper({ symbol: "B", premiumBps: -50, liquidityUsd: 1e6 });
    expect(rankWrappers([a, b], "sell").map((w) => w.symbol)).toEqual(["A", "B"]);
  });

  /**
   * CRCL on mainnet: CRCLon showed the better headline price on $224 of liquidity while CRCLx
   * held $2.1m. Ranking on displayed premium alone recommends the one nobody can trade.
   */
  it("does not recommend a dust-liquidity wrapper on the cheap path", () => {
    const crclon = wrapper({ symbol: "CRCLon", premiumBps: -289, liquidityUsd: 224 });
    const crclx = wrapper({ symbol: "CRCLx", premiumBps: 74, liquidityUsd: 2_135_469 });
    expect(rankWrappers([crclon, crclx], "buy").map((w) => w.symbol)).toEqual(["CRCLx", "CRCLon"]);
  });

  it("still prefers measured depth over the liquidity heuristic", () => {
    const thinButRoutable = wrapper({
      symbol: "THIN",
      premiumBps: -100,
      liquidityUsd: 1_000,
      execution: { sizeUsd: 1000, side: "buy", routable: true, slippageBps: 5, allInBps: -95, tradeableWithin50Bps: 1000 },
    });
    const deepButUnroutable = wrapper({
      symbol: "DEEP",
      premiumBps: -200,
      liquidityUsd: 5_000_000,
      execution: { sizeUsd: 1000, side: "buy", routable: false, slippageBps: null, allInBps: null, tradeableWithin50Bps: 0 },
    });
    expect(rankWrappers([deepButUnroutable, thinButRoutable], "buy").map((w) => w.symbol)).toEqual(["THIN", "DEEP"]);
  });

  it("sorts wrappers with no price last", () => {
    const priced = wrapper({ symbol: "A", premiumBps: 500, liquidityUsd: 1e6 });
    const unpriced = wrapper({ symbol: "B", liquidityUsd: 1e6 });
    expect(rankWrappers([unpriced, priced], "buy").map((w) => w.symbol)).toEqual(["A", "B"]);
  });
});

describe("isRecommendable", () => {
  it("trusts measured routability over liquidity", () => {
    const w = wrapper({
      symbol: "X",
      liquidityUsd: 10,
      execution: { sizeUsd: 1000, side: "buy", routable: true, slippageBps: 5, allInBps: 5, tradeableWithin50Bps: 1000 },
    });
    expect(isRecommendable(w)).toBe(true);
  });

  it("falls back to the liquidity floor", () => {
    expect(isRecommendable(wrapper({ symbol: "X", liquidityUsd: 224 }))).toBe(false);
    expect(isRecommendable(wrapper({ symbol: "X", liquidityUsd: 2_000_000 }))).toBe(true);
  });

  it("treats unknown liquidity as untradeable", () => {
    expect(isRecommendable(wrapper({ symbol: "X" }))).toBe(false);
  });
});
