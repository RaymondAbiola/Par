import type { MetadataRoute } from "next";
import { multiIssuerListings } from "@/core/registry";

const BASE = "https://par-sigma.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/check", "/history"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "hourly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const tickers = multiIssuerListings()
    .slice(0, 200)
    .map((l) => ({
      url: `${BASE}/s/${l.ticker}`,
      changeFrequency: "hourly" as const,
      priority: 0.5,
    }));

  return [...pages, ...tickers];
}
