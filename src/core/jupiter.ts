import { createRateLimiter } from "@/core/http";

export const JUPITER_LITE = "https://lite-api.jup.ag";

// one budget shared by token search and swap quotes: lite-api allows roughly 60 requests a minute
export const jupiterThrottle = createRateLimiter(1_100);

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;
