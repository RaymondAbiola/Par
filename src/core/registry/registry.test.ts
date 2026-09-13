import { describe, expect, it } from "vitest";
import { allListings, allMints, getByMint, getListing, multiIssuerListings } from "@/core/registry";

describe("registry snapshot", () => {
  it("is populated", () => {
    expect(allListings().length).toBeGreaterThan(200);
  });

  it("carries the liquid names we build the demo around", () => {
    for (const ticker of ["NVDA", "TSLA", "AAPL", "SPY", "NFLX"]) {
      const listing = getListing(ticker);
      expect(listing, `${ticker} missing from snapshot`).toBeDefined();
      expect(listing?.wrappers.length).toBeGreaterThan(0);
    }
  });

  it("has a meaningful set of cross-issuer comparisons", () => {
    expect(multiIssuerListings().length).toBeGreaterThan(100);
  });

  it("uses globally unique mints", () => {
    const mints = allMints();
    expect(new Set(mints).size).toBe(mints.length);
  });

  it("resolves a mint back to its listing", () => {
    const nvda = getListing("NVDA");
    const mint = nvda?.wrappers[0]?.mint;
    expect(mint).toBeDefined();
    expect(getByMint(mint!)?.listing.ticker).toBe("NVDA");
  });

  it("is case insensitive on ticker lookup", () => {
    expect(getListing("nvda")?.ticker).toBe("NVDA");
  });
});
