import { describe, expect, it } from "vitest";
import { getSession } from "@/core/prices/session";

// helper: build a UTC instant. Eastern is UTC-4 in September (EDT), UTC-5 in January (EST).
const utc = (iso: string) => new Date(iso);

describe("getSession", () => {
  it("calls the regular session during trading hours", () => {
    const state = getSession(utc("2026-09-14T14:00:00Z")); // 10:00 ET Mon
    expect(state.session).toBe("regular");
    expect(state.live).toBe(true);
  });

  it("treats the 09:30 open as regular", () => {
    expect(getSession(utc("2026-09-14T13:30:00Z")).session).toBe("regular");
  });

  it("treats one minute before the open as premarket", () => {
    expect(getSession(utc("2026-09-14T13:29:00Z")).session).toBe("premarket");
  });

  it("treats the 16:00 close as after hours", () => {
    const state = getSession(utc("2026-09-14T20:00:00Z"));
    expect(state.session).toBe("afterhours");
    expect(state.live).toBe(false);
  });

  it("calls 20:00 ET onwards overnight", () => {
    expect(getSession(utc("2026-09-15T00:30:00Z")).session).toBe("overnight");
  });

  it("calls the small hours overnight", () => {
    expect(getSession(utc("2026-09-14T07:00:00Z")).session).toBe("overnight");
  });

  it("detects the weekend", () => {
    const state = getSession(utc("2026-09-13T18:00:00Z")); // Sunday
    expect(state.session).toBe("weekend");
    expect(state.live).toBe(false);
  });

  it("detects a full holiday closure", () => {
    const state = getSession(utc("2026-11-26T15:00:00Z")); // Thanksgiving
    expect(state.session).toBe("holiday");
    expect(state.live).toBe(false);
  });

  // the day after Thanksgiving closes at 13:00 ET, and November is EST so ET is UTC-5
  it("closes early on a half day", () => {
    expect(getSession(utc("2026-11-27T18:30:00Z")).session).toBe("afterhours");
    expect(getSession(utc("2026-11-27T17:30:00Z")).session).toBe("regular");
  });

  it("handles the EST half of the year", () => {
    const state = getSession(utc("2026-01-05T15:00:00Z")); // 10:00 EST Mon
    expect(state.session).toBe("regular");
  });

  it("never reports live outside the regular session", () => {
    for (const iso of [
      "2026-09-14T07:00:00Z",
      "2026-09-14T13:00:00Z",
      "2026-09-14T21:00:00Z",
      "2026-09-13T18:00:00Z",
    ]) {
      expect(getSession(utc(iso)).live, iso).toBe(false);
    }
  });
});
