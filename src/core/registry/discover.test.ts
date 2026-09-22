import { describe, expect, it } from "vitest";
import { __test } from "@/core/registry/discover";
import type { JupiterToken } from "@/core/registry/jupiter";

function token(partial: Partial<JupiterToken> & Pick<JupiterToken, "id" | "symbol">): JupiterToken {
  return {
    name: partial.symbol,
    decimals: 8,
    tags: [],
    usdPrice: null,
    liquidity: null,
    holderCount: null,
    volume24h: null,
    ...partial,
  };
}

describe("classify", () => {
  const { classify } = __test;

  it("identifies an xStock by tag", () => {
    const t = token({ id: "Xsc9qv", symbol: "NVDAx", tags: ["xstocks"] });
    expect(classify(t, "NVDA")).toBe("xstocks");
  });

  it("identifies an xStock by mint prefix when tags are missing", () => {
    const t = token({ id: "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL", symbol: "NFLXx" });
    expect(classify(t, "NFLX")).toBe("xstocks");
  });

  it("identifies an Ondo wrapper by mint suffix", () => {
    const t = token({ id: "gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo", symbol: "NVDAon" });
    expect(classify(t, "NVDA")).toBe("ondo");
  });

  it("identifies a backpack wrapper by issuer name", () => {
    const t = token({ id: "SomeMint", symbol: "AMD", name: "Advanced Micro Devices - Backpack Securities", decimals: 6 });
    expect(classify(t, "AMD")).toBe("backpack");
  });

  // a bare ticker is a weak signal, so without the issuer name it must not match
  it("rejects a bare ticker with no issuer signal", () => {
    const t = token({ id: "SomeMint", symbol: "AMD", name: "Advanced Micro Devices" });
    expect(classify(t, "AMD")).toBeNull();
  });

  it("rejects a lookalike whose symbol does not match the ticker", () => {
    const t = token({ id: "Xsomething", symbol: "NVDIAx", tags: ["xstocks"] });
    expect(classify(t, "NVDA")).toBeNull();
  });

  // pairz.fun and friends squat on stock names, so a bare name match must not be enough
  it("rejects an impostor with a stock-like name", () => {
    const t = token({ id: "Bx793jHKhpJbTL1pKHaNZPCQwQJkiR4PctKmCqDtpair", symbol: "dogtest" });
    expect(classify(t, "TSLA")).toBeNull();
  });

  it("rejects a token whose symbol matches but issuer signals do not", () => {
    const t = token({ id: "SomeRandomMint", symbol: "TSLAx" });
    expect(classify(t, "TSLA")).toBeNull();
  });
});

describe("toListing", () => {
  const { toListing } = __test;
  const asset = {
    symbol: "NVDAon",
    ticker: "NVDA",
    name: "NVIDIA",
    instrument: "stock" as const,
    tradingPaused: false,
    offhoursTradable: true,
    primaryPrice: 215.69,
    impliedSharePrice: 215.5,
    session: "offhours",
    nextMarketOpen: null,
  };

  it("collects both wrappers and orders them deterministically", () => {
    const listing = toListing(asset, [
      token({ id: "Xsc9qv", symbol: "NVDAx", tags: ["xstocks"] }),
      token({ id: "gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo", symbol: "NVDAon", decimals: 9 }),
    ]);
    expect(listing?.wrappers.map((w) => w.issuer)).toEqual(["ondo", "xstocks"]);
    expect(listing?.wrappers.map((w) => w.decimals)).toEqual([9, 8]);
  });

  it("returns null when nothing matches", () => {
    expect(toListing(asset, [token({ id: "junk", symbol: "JUNK" })])).toBeNull();
  });
});
