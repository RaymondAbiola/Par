# @par/sdk

Typed client for [Par](https://par-sigma.vercel.app) — fair value and best execution for tokenized
equities on Solana. No dependencies.

```bash
npm install @par/sdk
```

## The bit you probably came for

Tokenized equities on Solana handle splits and dividends through the Token-2022 scaled-UI
multiplier. The mint stores a *current* multiplier alongside a *scheduled* one; once the schedule
passes, the stored field is wrong and nothing updates it. At the time of writing **105 of 656
wrappers** store a stale value, and NFLXx's stored field reads `1` while the real multiplier has
been `10` since November 2025.

The RPC's `uiAmount` handles this for you. Anything touching the raw `amount` does not.

```ts
import { effectiveMultiplier, rawToShares } from "@par/sdk";

// straight off the mint's scaledUiAmountConfig extension
const multiplier = effectiveMultiplier(config);

const shares = rawToShares(tokenAmount.amount, tokenAmount.decimals, multiplier);
```

Both are pure functions with no network calls. If you take nothing else from this package, take
these two.

## Client

```ts
import { Par } from "@par/sdk";

const par = new Par();

// widest cross-issuer dislocations right now
const { data } = await par.tickers({ limit: 10 });

// what a trade actually costs, with real quotes routed at your size
const { data: nvda } = await par.bestVenue("NVDA", 10_000, "buy");
console.log(nvda.decision.best, nvda.decision.savingUsd);

// every wrapper whose stored multiplier is stale
const { data: report } = await par.multipliers();
console.log(`${report.stale} of ${report.scanned} wrappers are stale`);

// value a wallet, correctly and naively
const { data: portfolio } = await par.portfolio(address);
console.log(portfolio.totalValue - portfolio.naiveTotal);
```

Point it elsewhere with `new Par({ baseUrl: "http://localhost:3000" })`, or supply your own
`fetch`.

## Reading a premium honestly

`premiumBps` is measured against the **real share price**. Outside regular US trading hours that
price is the last close, not a live quote — `reference.live` says which, and `reference.basis`
spells it out (`"live"` or `"Mon, Sep 14 close"`). Any number you surface from this API should carry
that qualifier too.

## Displayed price is not execution price

`premiumBps` is a headline. A wrapper can show the better price and be untradeable: on mainnet,
CRCLon has shown a 2.9% discount on $224 of liquidity while CRCLx held $2.1M. Call `bestVenue()`
when it matters — it routes a real quote at your size and returns `execution.allInBps` plus an
`excludedBecause` reason for anything it rules out.

## OpenAPI

`GET https://par-sigma.vercel.app/api/v1/openapi`

## Licence

MIT
