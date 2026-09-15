# Par

Fair value and best execution for tokenized equities on Solana.

**Live at [par-sigma.vercel.app](https://par-sigma.vercel.app)**

## The problem

Apple stock exists on Solana more than once. So does Nvidia, Tesla, and 211 other US equities.
Backed issues them as xStocks, Ondo issues them as Global Markets tokens, and each token has its
own liquidity pool and its own price.

Nothing tells you which one to buy.

At the time of writing, Apple's two wrappers are trading 8.92 percentage points apart on the same
underlying share. GameStop's cheaper looking wrapper sits on nineteen dollars of liquidity, so the
better price is not a price at all, it is a number nobody can fill against. Walmart has shown a
five point gap where one side simply does not route.

Par measures every wrapper against the real share price, and tells you which one you can actually
buy.

## What it does

**Monitors dislocation.** Every tokenized equity with meaningful liquidity, priced against the
underlying share, ranked by how far the issuers have drifted apart.

**Routes real quotes.** Headline price is not execution price. Give Par a trade size and it routes
a genuine quote through each wrapper, then tells you the all in cost and which venue wins.

**Catches a valuation bug that is easy to hit.** These tokens rebase through a Token-2022 scaled UI
multiplier. Right now 100 of 216 xStocks wrappers store a multiplier that is no longer the one in
force. Read the stored value and you can be wrong by a factor of ten.

**Keeps history.** A collector snapshots every tracked wrapper every fifteen minutes, so the
question "does the gap widen when the market is shut" has an answer measured rather than assumed.

## Three things that are easy to get wrong

These are worth reading even if you never use Par, because every one of them cost us a bug first.

### 1. The multiplier on the mint is not the multiplier in force

Token-2022's scaled UI extension stores a current multiplier next to a scheduled replacement and
the timestamp it takes effect. Once that timestamp passes, nothing rewrites the first field. It
just quietly stops being true.

Netflix split ten for one. NFLXx has stored `multiplier: 1` since November 2025 while the real
multiplier has been `10`. One raw NFLXx is ten shares, worth about seven hundred and fifty dollars,
not seventy five.

```ts
const multiplier =
  now >= config.newMultiplierEffectiveTimestamp
    ? config.newMultiplier
    : config.multiplier;
```

`GET /api/v1/multipliers` returns every wrapper currently in this state.

### 2. `uiAmount` is safe, raw `amount` is not

Solana's RPC applies the multiplier when it reports `uiAmount`, so reading that gives you the right
answer. We checked this against the largest NFLXx account before claiming otherwise, and we were
glad we did.

The trap is that you cannot use `uiAmount` for anything on chain. Swap routing, pool maths, and
your own accounting all work in raw atomic units, and there the multiplier is yours to apply. Get
it wrong on a rebased mint and you are off by the full factor.

Jupiter is a good example of why this bites: its price endpoint returns dollars per share
equivalent with the multiplier already applied, while its quote endpoint takes and returns raw
atomic units without it. Mixing the two denominations silently misprices every rebased token.

### 3. The cheaper wrapper is often the one you cannot trade

Circle's Ondo wrapper has shown a 2.9% discount sitting on $224 of liquidity, while the xStocks
wrapper held $2.1 million. Ranking on displayed premium alone recommends the token nobody can buy.

Par ranks on all in executable cost. Where depth has been measured it uses the real quote. Where it
has not, it falls back to a liquidity floor calibrated against measured behaviour rather than
guessed: AMDx holds about $12.7k and still slipped fourteen percent on a thousand dollar buy, while
WMTx holds about $29k and cleared ten thousand for eleven basis points. The line sits between them.

## Try it without installing anything

```bash
# widest cross-issuer dislocations right now
curl -s "https://par-sigma.vercel.app/api/v1/tickers?limit=5"

# what ten thousand dollars of Nvidia actually costs, per wrapper
curl -s "https://par-sigma.vercel.app/api/v1/ticker/NVDA?size=10000"

# every wrapper whose stored multiplier is stale
curl -s "https://par-sigma.vercel.app/api/v1/multipliers?limit=10"

# value a wallet, correctly and naively
curl -s "https://par-sigma.vercel.app/api/v1/portfolio/YOUR_ADDRESS"
```

No key, no rate limit, CORS open. Full reference in [docs/api.md](docs/api.md), OpenAPI 3.1 at
[/api/v1/openapi](https://par-sigma.vercel.app/api/v1/openapi).

There is also a dependency free SDK in [`sdk/`](sdk), which exports the two pure functions above so
you can fix your own code without depending on ours.

## How it works

```
registry     discovers every tokenized equity on Solana, one snapshot committed to the repo
multiplier   reads Token-2022 mint state and resolves the multiplier actually in force
reference    the real share price, with the session and how stale that price is
onchain      per wrapper price, liquidity and volume from Jupiter
depth        routes real quotes at a given size to measure execution cost
par engine   combines all of the above into a premium, a spread, and a ranking
```

Two deliberate choices shape the rest.

**The reference price is honest about being old.** Outside regular US trading hours, free market
data gives you the last close rather than a live quote. Par never pretends otherwise. Every premium
carries a `basis` field that reads either `live` or something like `Mon, Sep 14 close`, and the
interface prints it next to the number.

**The scan prices on chain first, then spends its budget.** Finnhub's free tier allows sixty calls
a minute and there are 213 tickers with more than one issuer. Pricing everything on chain is cheap
and batched, so Par does that first, ranks by liquidity, then spends its live quote budget on the
names that matter. The tail falls back to a price implied from market cap, labelled as such.

## Running it locally

```bash
git clone https://github.com/RaymondAbiola/Par.git
cd Par
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

You need two free keys: [Helius](https://helius.dev) for Solana RPC and
[Finnhub](https://finnhub.io) for share prices. `DATABASE_URL` is only needed for the history page.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | 143 tests, no network required |
| `npm run check:multipliers` | Sweep every mint and list the stale ones |
| `npm run check:par` | Live premium table in your terminal |
| `npm run check:depth NVDA AMD` | Route real quotes and print the slippage ladder |
| `npm run registry:refresh` | Rediscover every wrapper (slow, roughly nine minutes) |
| `npm run capture` | Write one history snapshot |

The tests run entirely offline. Fixtures are pinned to values observed on mainnet rather than
invented, so if an issuer changes something the tests tell you what moved.

## Where the data comes from

| Source | Used for |
| --- | --- |
| Helius | Solana RPC, Token-2022 mint state, wallet balances |
| Jupiter | Wrapper prices, liquidity, and real swap quotes |
| Finnhub | US share prices, the reference everything is measured against |
| Ondo | Issuer catalogue, primary market NAV, session state |
| Neon | Premium history |

## What this does not claim

Worth being precise, because the numbers here are easy to misread.

**Nobody has lost money to the stale multiplier.** Issuer accounting is correct, and wallets that
read `uiAmount` show the right balance. It is an integration hazard for code that touches raw
amounts, which is most on chain code, and it is also a hazard we hit ourselves before we fixed it.

**A large wallet valued two ways is not a discrepancy.** Par can show that an omnibus wallet would
be valued $185 million lower by naive arithmetic. That is a statement about the arithmetic, not
about the wallet or its owner.

**Premiums outside trading hours are measured against a prior close.** They are real, and they are
also partly the market pricing risk it cannot hedge until the open. Par labels the basis so you can
judge that yourself.

**Finnhub's free tier is non-commercial.** Fine for this. A production deployment would need a paid
plan.

Par is measurement, not advice.

## Licence

MIT.
