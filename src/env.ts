import { z } from "zod";

const schema = z.object({
  HELIUS_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export const env = schema.parse(process.env);

// validated at point of use, not at boot, so the app still builds with an empty .env
export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing ${key}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}
