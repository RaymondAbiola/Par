import { setDefaultResultOrder } from "node:dns";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "@/env";

/**
 * Neon's host publishes both A and AAAA records. Node prefers IPv6, and on a machine with no
 * IPv6 route that surfaces as an opaque "fetch failed" rather than a timeout you can diagnose.
 * The scripts pass --dns-result-order, but next dev, build and start do not, so set it here.
 */
try {
  setDefaultResultOrder("ipv4first");
} catch {
  // not available in every runtime, and harmless where IPv6 works
}

export type Sql = ReturnType<typeof neon>;

let cached: Sql | null = null;

export function sql(): Sql {
  cached ??= neon(requireEnv("DATABASE_URL"));
  return cached;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
