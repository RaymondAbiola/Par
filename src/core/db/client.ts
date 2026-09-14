import { neon } from "@neondatabase/serverless";
import { requireEnv } from "@/env";

export type Sql = ReturnType<typeof neon>;

let cached: Sql | null = null;

export function sql(): Sql {
  cached ??= neon(requireEnv("DATABASE_URL"));
  return cached;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
