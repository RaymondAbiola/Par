import { describe, expect, it } from "vitest";
import { toWireReference, toWireWrapper } from "@/core/par/wire";
import type { WrapperPar } from "@/core/par/engine";
import type { RankedWrapper } from "@/core/par/normalize";

const base: WrapperPar = {
  mint: "Xsc9qv",
  symbol: "NVDAx",
  issuer: "xstocks",
  decimals: 8,
  pricePerShare: 213.6543219,
  premiumBps: -212.83719,
  liquidityUsd: 1_773_937.123456,
  volume24hUsd: 9_134_424.5,
  holders: 90_888,
  multiplier: {
    mint: "Xsc9qv",
    decimals: 8,
    stored: 1.0009180758490996,
    effective: 1.001701196801074,
    pending: 1.001701196801074,
    effectiveFrom: 1789000200,
    stale: true,
    naiveErrorBps: 7.8219,
  },
  execution: null,
};

describe("toWireWrapper", () => {
  it("rounds to sane precision and derives percent from bps", () => {
    const wire = toWireWrapper(base);
    expect(wire.pricePerShare).toBe(213.654322);
    expect(wire.premiumBps).toBe(-212.84);
    expect(wire.premiumPct).toBe(-2.1284);
  });

  it("exposes the stale multiplier and when it changed", () => {
    const wire = toWireWrapper(base);
    expect(wire.multiplier?.stale).toBe(true);
    expect(wire.multiplier?.effective).toBe(1.001701196801074);
    expect(wire.multiplier?.effectiveFrom).toBe("2026-09-10T00:30:00.000Z");
  });

  it("omits ranking fields for an unranked wrapper", () => {
    expect(toWireWrapper(base).rank).toBeUndefined();
  });

  it("carries ranking fields through when present", () => {
    const ranked: RankedWrapper = { ...base, rank: 2, recommendable: false, excludedBecause: "thin-liquidity" };
    const wire = toWireWrapper(ranked);
    expect(wire.rank).toBe(2);
    expect(wire.excludedBecause).toBe("thin-liquidity");
  });

  it("survives missing values", () => {
    const wire = toWireWrapper({ ...base, pricePerShare: null, premiumBps: null, multiplier: null });
    expect(wire.pricePerShare).toBeNull();
    expect(wire.premiumPct).toBeNull();
    expect(wire.multiplier).toBeNull();
  });
});

describe("toWireReference", () => {
  it("serialises the basis honestly", () => {
    const wire = toWireReference({
      ticker: "NVDA",
      price: 218.29,
      source: "finnhub",
      asOf: new Date("2026-09-11T20:00:00.000Z"),
      ageSeconds: 218_293,
      session: "premarket",
      live: false,
      basis: "Fri, Sep 11 close",
    });
    expect(wire).toMatchObject({ live: false, basis: "Fri, Sep 11 close", session: "premarket" });
    expect(wire?.asOf).toBe("2026-09-11T20:00:00.000Z");
  });

  it("passes null through", () => {
    expect(toWireReference(null)).toBeNull();
  });
});
