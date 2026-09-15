import { preflight } from "@/lib/api";

const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=3600" };

const ok = (schema: object) => ({
  "200": { description: "OK", content: { "application/json": { schema } } },
});

const envelope = (data: object) => ({
  type: "object",
  properties: {
    data,
    meta: {
      type: "object",
      properties: {
        generatedAt: { type: "string", format: "date-time" },
        session: { type: "string", enum: ["regular", "premarket", "afterhours", "overnight", "weekend", "holiday"] },
        marketLive: { type: "boolean" },
        eastern: { type: "string" },
      },
    },
  },
});

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Par",
    version: "0.1.0",
    description:
      "Fair value and best execution for tokenized equities on Solana. Premiums are measured against the real share price; outside regular trading hours that price is the last close and every response says so in `reference.basis`.",
    license: { name: "MIT" },
  },
  servers: [{ url: "https://par-sigma.vercel.app/api/v1" }],
  paths: {
    "/tickers": {
      get: {
        summary: "Cross-issuer dislocations, widest spread first",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
          { name: "minLiquidity", in: "query", schema: { type: "integer", default: 25000 } },
          { name: "tickers", in: "query", schema: { type: "string" }, description: "Comma-separated, e.g. NVDA,TSLA" },
        ],
        responses: ok(envelope({ type: "array", items: { $ref: "#/components/schemas/Ticker" } })),
      },
    },
    "/ticker/{ticker}": {
      get: {
        summary: "One underlying across every wrapper",
        description: "Pass `size` to route a real quote through each wrapper and get a venue decision.",
        parameters: [
          { name: "ticker", in: "path", required: true, schema: { type: "string" } },
          { name: "size", in: "query", schema: { type: "integer" }, description: "Trade size in USD" },
          { name: "side", in: "query", schema: { type: "string", enum: ["buy", "sell"], default: "buy" } },
        ],
        responses: ok(envelope({ $ref: "#/components/schemas/Ticker" })),
      },
    },
    "/token/{mint}": {
      get: {
        summary: "One wrapper by mint",
        parameters: [{ name: "mint", in: "path", required: true, schema: { type: "string" } }],
        responses: ok(envelope({ $ref: "#/components/schemas/Wrapper" })),
      },
    },
    "/multipliers": {
      get: {
        summary: "Wrappers whose stored scaled-UI multiplier is no longer the live one",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
          { name: "staleOnly", in: "query", schema: { type: "boolean", default: true } },
        ],
        responses: ok(envelope({ $ref: "#/components/schemas/MultiplierReport" })),
      },
    },
    "/portfolio/{owner}": {
      get: {
        summary: "Value a wallet's tokenized equities, correctly and naively",
        parameters: [{ name: "owner", in: "path", required: true, schema: { type: "string" } }],
        responses: ok(envelope({ $ref: "#/components/schemas/Portfolio" })),
      },
    },
    "/health": { get: { summary: "Registry counts", responses: ok(envelope({ type: "object" })) } },
  },
  components: {
    schemas: {
      Multiplier: {
        type: "object",
        properties: {
          effective: { type: "number", description: "The multiplier actually in force" },
          stored: { type: "number", description: "What the mint stores, which may be stale" },
          stale: { type: "boolean" },
          naiveErrorBps: { type: "number" },
          effectiveFrom: { type: ["string", "null"], format: "date-time" },
        },
      },
      Wrapper: {
        type: "object",
        properties: {
          mint: { type: "string" },
          symbol: { type: "string" },
          issuer: { type: "string", enum: ["xstocks", "ondo"] },
          decimals: { type: "integer" },
          pricePerShare: { type: ["number", "null"] },
          premiumBps: { type: ["number", "null"], description: "Positive is above the real share" },
          premiumPct: { type: ["number", "null"] },
          liquidityUsd: { type: ["number", "null"] },
          volume24hUsd: { type: ["number", "null"] },
          holders: { type: ["integer", "null"] },
          multiplier: { $ref: "#/components/schemas/Multiplier" },
          execution: { type: ["object", "null"] },
          rank: { type: "integer" },
          recommendable: { type: "boolean" },
          excludedBecause: { type: ["string", "null"], enum: ["no-price", "unroutable", "thin-liquidity", null] },
        },
      },
      Ticker: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          name: { type: "string" },
          instrument: { type: "string", enum: ["stock", "etf", "other"] },
          reference: {
            type: ["object", "null"],
            properties: {
              price: { type: "number" },
              source: { type: "string", enum: ["finnhub", "ondo-implied"] },
              asOf: { type: "string", format: "date-time" },
              ageSeconds: { type: "integer" },
              live: { type: "boolean" },
              basis: { type: "string", description: 'e.g. "live" or "Mon, Sep 14 close"' },
            },
          },
          spreadBps: { type: ["number", "null"] },
          spreadPct: { type: ["number", "null"] },
          wrappers: { type: "array", items: { $ref: "#/components/schemas/Wrapper" } },
        },
      },
      MultiplierReport: {
        type: "object",
        properties: {
          scanned: { type: "integer" },
          stale: { type: "integer" },
          rebasing: { type: "integer" },
          rows: { type: "array", items: { type: "object" } },
        },
      },
      Portfolio: {
        type: "object",
        properties: {
          owner: { type: "string" },
          totalValue: { type: "number", description: "Using the effective multiplier" },
          naiveTotal: { type: "number", description: "Raw amount without the multiplier" },
          storedFieldTotal: { type: "number", description: "Using the mint's stored multiplier" },
          positions: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(spec, { headers: CORS });
}

export const OPTIONS = preflight;
