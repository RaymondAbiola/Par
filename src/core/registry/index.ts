import snapshot from "./snapshot.json";
import type { EquityListing, Registry, Wrapper } from "@/core/types";

export const registry = snapshot as Registry;

const byTicker = new Map<string, EquityListing>();
const byMint = new Map<string, { listing: EquityListing; wrapper: Wrapper }>();

for (const listing of registry.listings) {
  byTicker.set(listing.ticker.toUpperCase(), listing);
  for (const wrapper of listing.wrappers) {
    byMint.set(wrapper.mint, { listing, wrapper });
  }
}

export function getListing(ticker: string): EquityListing | undefined {
  return byTicker.get(ticker.toUpperCase());
}

export function getByMint(mint: string) {
  return byMint.get(mint);
}

export function allListings(): EquityListing[] {
  return registry.listings;
}

export function allMints(): string[] {
  return [...byMint.keys()];
}

/** Tickers carried by more than one issuer: the cross-issuer comparisons worth surfacing. */
export function multiIssuerListings(): EquityListing[] {
  return registry.listings.filter((l) => l.wrappers.length > 1);
}
