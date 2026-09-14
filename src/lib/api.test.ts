import { describe, expect, it } from "vitest";
import { intParam } from "@/lib/api";

describe("intParam", () => {
  it("parses a value", () => expect(intParam("50", 25, 1, 100)).toBe(50));
  it("falls back on null", () => expect(intParam(null, 25, 1, 100)).toBe(25));
  it("falls back on an empty string", () => expect(intParam("", 25, 1, 100)).toBe(25));
  it("falls back on whitespace", () => expect(intParam("   ", 25, 1, 100)).toBe(25));
  it("falls back on nonsense", () => expect(intParam("abc", 25, 1, 100)).toBe(25));
  it("still accepts an explicit zero", () => expect(intParam("0", 25, 0, 100)).toBe(0));
  it("clamps above the max", () => expect(intParam("9999", 25, 1, 100)).toBe(100));
  it("clamps below the min", () => expect(intParam("-5", 25, 1, 100)).toBe(1));
  it("rounds a float", () => expect(intParam("12.7", 25, 1, 100)).toBe(13));
});
