# Par API

Base URL: `https://par-sigma.vercel.app/api/v1`

No authentication, no rate limit, CORS open to any origin. Responses are cached at the edge for
thirty seconds while the US market is open and five minutes when it is closed, because a shut
market cannot move a price.

OpenAPI 3.1 spec: [`/api/v1/openapi`](https://par-sigma.vercel.app/api/v1/openapi)

## Response shape

Every successful response is wrapped:

```json
{
  "data": { },
  "meta": {
    "generatedAt": "2026-09-15T01:13:00.000Z",
    "session": "afterhours",
    "marketLive": false,
    "eastern": "2026-09-14 21:13 ET"
  }
}
```

Errors are not wrapped:

```json
{ "error": { "code": "unknown_ticker", "message": "No tokenized wrapper found for FAKE" } }
```

| Code | Status | Meaning |
| --- | --- | --- |
| `unknown_ticker` | 404 | No tokenized wrapper exists for that symbol |
| `unknown_mint` | 404 | That mint is not a known tokenized equity |
| `bad_address` | 400 | Not a valid Solana address |
| `upstream_error` | 502 | A data source failed or rate limited us |

## Reading a premium correctly

`premiumBps` is measured against the real share price. Positive means the token trades above the
underlying, negative means below.

The number it is measured against is not always live. Outside regular US trading hours, the
reference is the last close. Two fields tell you which:

```json
"reference": {
  "price": 218.29,
  "source": "finnhub",
  "asOf": "2026-09-14T20:00:00.000Z",
  "ageSeconds": 21600,
  "live": false,
  "basis": "Mon, Sep 14 close"
}
```

If you surface a premium in your own interface, surface the basis with it.

`source` is `finnhub` for a real quote, or `ondo-implied` for a price derived from market
capitalisation over shares outstanding. The second is a fallback for the long tail and is less
precise, so treat it accordingly.

---

## GET /tickers

Cross-issuer dislocations, widest spread first.

| Parameter | Default | Notes |
| --- | --- | --- |
| `limit` | 25 | Maximum 100 |
| `minLiquidity` | 25000 | Skip tickers where no wrapper holds at least this much |
| `tickers` | | Comma separated, for example `NVDA,TSLA`. Overrides the ranking |

```bash
curl -s "https://par-sigma.vercel.app/api/v1/tickers?limit=3"
```

Each entry carries the underlying, the reference price, the spread between wrappers, and every
wrapper ranked cheapest first. `rank: 1` is the one to use. Anything with `recommendable: false`
carries an `excludedBecause` of `no-price`, `unroutable`, or `thin-liquidity`.

Note that `limit` controls how many results come back, not how many get scanned. Par always scans
wider than it returns, otherwise "biggest dislocations" would quietly mean "biggest tickers".

## GET /ticker/{ticker}

One underlying across every wrapper.

| Parameter | Default | Notes |
| --- | --- | --- |
| `size` | | Trade size in USD. Adding this routes real quotes |
| `side` | `buy` | `buy` or `sell` |

Without `size` you get headline prices, which is fast and cached.

With `size`, Par routes a genuine Jupiter quote through each wrapper and adds an `execution` block
plus a `decision`:

```bash
curl -s "https://par-sigma.vercel.app/api/v1/ticker/WMT?size=10000"
```

```json
"decision": { "sizeUsd": 10000, "side": "buy", "best": "WMTx", "savingUsd": null }
```

`allInBps` is premium plus slippage, signed so that positive is always worse for you. That sign
flips with side, because paying above the underlying costs a buyer and pays a seller.

`savingUsd` is null when there is no tradeable alternative to compare against. That is not missing
data, it means the other wrapper could not be filled at all.

## GET /token/{mint}

A single wrapper by mint address, with a summary of its underlying.

## GET /multipliers

Every wrapper whose stored scaled UI multiplier is no longer the one in force.

| Parameter | Default | Notes |
| --- | --- | --- |
| `limit` | 100 | Maximum 1000 |
| `staleOnly` | `true` | Pass `false` to include healthy wrappers |

```bash
curl -s "https://par-sigma.vercel.app/api/v1/multipliers?limit=5"
```

```json
{
  "scanned": 656,
  "rebasing": 341,
  "stale": 100,
  "rows": [
    {
      "symbol": "NFLXx",
      "issuer": "xstocks",
      "stored": 1,
      "effective": 10,
      "naiveErrorFactor": 10,
      "effectiveFrom": "2025-11-16T23:55:00.000Z"
    }
  ]
}
```

`naiveErrorFactor` is how wrong you are if you trust `stored`. A value of 10 means a tenth of the
real holding.

This is the endpoint to poll if you integrate these tokens anywhere. It is cheap, it is cached, and
it changes whenever an issuer schedules a corporate action.

## GET /portfolio/{owner}

Values every tokenized equity a wallet holds, three ways.

```bash
curl -s "https://par-sigma.vercel.app/api/v1/portfolio/YOUR_ADDRESS"
```

| Field | Meaning |
| --- | --- |
| `shares` | Effective multiplier applied. The true holding |
| `naiveShares` | Raw amount divided by decimals, multiplier ignored |
| `storedFieldShares` | Using the multiplier the mint stores |

On a rebased mint the last two are identical and both wrong, which is the clearest demonstration of
the hazard. Reaching for the mint's own multiplier field to fix the first mistake does not help.

## GET /health

Registry counts, uncached. Useful as a deploy check.

---

## SDK

```bash
npm install @par/sdk
```

```ts
import { Par, effectiveMultiplier, rawToShares } from "@par/sdk";

const par = new Par();
const { data } = await par.bestVenue("NVDA", 10_000);

// or skip the API entirely and just fix your own arithmetic
const multiplier = effectiveMultiplier(config);
const shares = rawToShares(amount, decimals, multiplier);
```

The client takes `{ baseUrl, fetch }` if you want to point it at a local instance or supply your
own fetch. Full notes in [`sdk/README.md`](../sdk/README.md).
