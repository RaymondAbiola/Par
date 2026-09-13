import { describe, expect, it } from "vitest";
import { formatBps, formatPercent, formatUsd, truncateAddress } from "@/lib/format";

describe("formatUsd", () => {
  it("formats dollars", () => {
    expect(formatUsd(218.29)).toBe("$218.29");
  });

  it("compacts large values", () => {
    expect(formatUsd(25833686, true)).toBe("$25.8M");
  });

  it("handles non-finite input", () => {
    expect(formatUsd(Number.NaN)).toBe("--");
  });
});

describe("formatPercent", () => {
  it("signs premiums", () => {
    expect(formatPercent(8.17)).toBe("+8.17%");
  });

  it("signs discounts", () => {
    expect(formatPercent(-1.2)).toBe("-1.20%");
  });

  it("treats zero as unsigned", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });
});

describe("formatBps", () => {
  it("rounds to whole basis points", () => {
    expect(formatBps(7.8)).toBe("+8 bp");
  });
});

describe("truncateAddress", () => {
  it("shortens a mint", () => {
    expect(truncateAddress("Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh")).toBe("Xsc9...9qEh");
  });

  it("leaves short strings alone", () => {
    expect(truncateAddress("abc")).toBe("abc");
  });
});
