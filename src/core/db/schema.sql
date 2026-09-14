create table if not exists premium_snapshots (
  id                bigserial primary key,
  captured_at       timestamptz not null default now(),

  ticker            text not null,
  mint              text not null,
  symbol            text not null,
  issuer            text not null,

  session           text not null,
  market_live       boolean not null,

  reference_price   numeric(18, 6),
  reference_source  text,
  reference_as_of   timestamptz,

  price_per_share   numeric(18, 6),
  premium_bps       numeric(12, 2),
  liquidity_usd     numeric(18, 2),
  volume_24h_usd    numeric(18, 2),

  multiplier        numeric(24, 12),
  multiplier_stale  boolean
);

create index if not exists premium_snapshots_ticker_time
  on premium_snapshots (ticker, captured_at desc);

create index if not exists premium_snapshots_time
  on premium_snapshots (captured_at desc);

-- one row per wrapper per run, so a run is identified by its timestamp alone
create index if not exists premium_snapshots_mint_time
  on premium_snapshots (mint, captured_at desc);
