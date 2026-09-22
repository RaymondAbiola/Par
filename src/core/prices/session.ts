export type MarketSession =
  | "regular"
  | "premarket"
  | "afterhours"
  | "overnight"
  | "weekend"
  | "holiday";

export interface SessionState {
  session: MarketSession;
  /** True only during the regular session, when a free-tier reference price is actually live. */
  live: boolean;
  /** Eastern wall clock, for display and debugging. */
  eastern: string;
  /** Minutes past midnight Eastern. */
  minutes: number;
}

// NYSE full closures. Extend as the calendar is published.
const HOLIDAYS = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

// 13:00 ET closes
const HALF_DAYS = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]);

const PREMARKET_OPEN = 4 * 60;
const REGULAR_OPEN = 9 * 60 + 30;
const REGULAR_CLOSE = 16 * 60;
const HALF_DAY_CLOSE = 13 * 60;
const AFTERHOURS_CLOSE = 20 * 60;

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

interface Eastern {
  date: string;
  minutes: number;
  weekday: string;
  display: string;
}

function eastern(at: Date): Eastern {
  const parts = new Map(formatter.formatToParts(at).map((p) => [p.type, p.value]));
  const date = `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
  const hour = Number(parts.get("hour") ?? 0);
  const minute = Number(parts.get("minute") ?? 0);

  return {
    date,
    minutes: hour * 60 + minute,
    weekday: parts.get("weekday") ?? "",
    display: `${date} ${String(hour).padStart(2, "0")}:${parts.get("minute")} ET`,
  };
}

export function getSession(at: Date = new Date()): SessionState {
  const { date, minutes, weekday, display } = eastern(at);
  const base = { eastern: display, minutes };

  if (weekday === "Sat" || weekday === "Sun") {
    return { ...base, session: "weekend", live: false };
  }
  if (HOLIDAYS.has(date)) {
    return { ...base, session: "holiday", live: false };
  }

  const close = HALF_DAYS.has(date) ? HALF_DAY_CLOSE : REGULAR_CLOSE;

  if (minutes < PREMARKET_OPEN) return { ...base, session: "overnight", live: false };
  if (minutes < REGULAR_OPEN) return { ...base, session: "premarket", live: false };
  if (minutes < close) return { ...base, session: "regular", live: true };
  if (minutes < AFTERHOURS_CLOSE) return { ...base, session: "afterhours", live: false };
  return { ...base, session: "overnight", live: false };
}

/** Abbreviated for the mobile header, where the full label will not fit. */
export const SESSION_SHORT: Record<MarketSession, string> = {
  regular: "Open",
  premarket: "Pre",
  afterhours: "After",
  overnight: "Night",
  weekend: "Weekend",
  holiday: "Holiday",
};

export const SESSION_LABEL: Record<MarketSession, string> = {
  regular: "Market open",
  premarket: "Pre-market",
  afterhours: "After hours",
  overnight: "Overnight",
  weekend: "Weekend",
  holiday: "Market holiday",
};
