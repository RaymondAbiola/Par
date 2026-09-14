import { describe, expect, it } from "vitest";
import { toSnapshotRows } from "@/core/db/history";
import type { TickerPar } from "@/core/par/engine";

const par: TickerPar = {
  ticker: "NVDA",
  name: "NVIDIA",
  instrument: "stock",
  reference: {
    ticker: "NVDA",
    price: 218.29,
    source: "finnhub",
    asOf: new Date("2026-09-14T20:00:00.000Z"),
    ageSeconds: 3600,
    session: "afterhours",
    live: false,
    basis: "Mon, Sep 14 close",
  },
  spreadBps: 38.24,
  wrappers: [
    {
      mint: "Xsc9qv",
      symbol: "NVDAx",
      issuer: "xstocks",
      decimals: 8,
      pricePerShare: 213.65,
      premiumBps: -212.83,
      liquidityUsd: 1_773_937,
      volume24hUsd: 9_134_424,
      holders: 90_888,
      multiplier: {
        mint: "Xsc9qv",
        decimals: 8,
        stored: 1.0009180758490996,
        effective: 1.001701196801074,
        pending: 1.001701196801074,
        effectiveFrom: 1789000200,
        stale: true,
        naiveErrorBps: 7.82,
      },
      execution: null,
    },
    {
      mint: "gEGt...ondo",
      symbol: "NVDAon",
      issuer: "ondo",
      decimals: 9,
      pricePerShare: null,
      premiumBps: null,
      liquidityUsd: 492,
      volume24hUsd: null,
      holders: null,
      multiplier: null,
      execution: null,
    },
  ],
};

describe("toSnapshotRows", () => {
  it("emits one row per wrapper", () => {
    expect(toSnapshotRows([par])).toHaveLength(2);
  });

  it("denormalises the reference onto every row so a run is self-contained", () => {
    const rows = toSnapshotRows([par]);
    expect(rows.every((r) => r.referencePrice === 218.29)).toBe(true);
    expect(rows[0]?.referenceAsOf).toBe("2026-09-14T20:00:00.000Z");
    expect(rows[0]?.referenceSource).toBe("finnhub");
  });

  it("records the effective multiplier and its staleness", () => {
    const row = toSnapshotRows([par])[0];
    expect(row?.multiplier).toBe(1.001701196801074);
    expect(row?.multiplierStale).toBe(true);
  });

  it("keeps unpriced wrappers as nulls rather than dropping them", () => {
    const row = toSnapshotRows([par])[1];
    expect(row?.symbol).toBe("NVDAon");
    expect(row?.pricePerShare).toBeNull();
    expect(row?.premiumBps).toBeNull();
    expect(row?.multiplier).toBeNull();
  });

  it("handles a ticker with no reference price", () => {
    const rows = toSnapshotRows([{ ...par, reference: null }]);
    expect(rows[0]?.referencePrice).toBeNull();
    expect(rows[0]?.referenceAsOf).toBeNull();
  });

  it("returns nothing for no input", () => {
    expect(toSnapshotRows([])).toEqual([]);
  });
});
