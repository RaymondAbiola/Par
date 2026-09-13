# Par

Fair-value and best-execution for tokenized equities on Solana.

The same underlying stock is issued as several different tokens — xStocks, Ondo, and others — each
with its own liquidity and its own price. Nothing today tells a user which wrapper to buy, or how
far above or below the real share price they are transacting. Par measures that gap and exposes it
as a dashboard, an API, and an SDK.

## Status

Under active development.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint |
