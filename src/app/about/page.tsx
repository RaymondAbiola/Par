import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { allListings, allMints, multiIssuerListings } from "@/core/registry";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Par measures, how it measures it, and what it deliberately does not claim.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-muted">{children}</div>
    </Card>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight">About Par</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Par is a measuring instrument for tokenized equities on Solana. It holds no funds, executes
          no trades, and takes no position. It reads public data and reports what it finds.
        </p>
      </section>

      <Card className="border-warn/40 bg-warn-soft">
        <div className="px-4 py-4">
          <h2 className="text-base font-semibold text-warn">Not investment advice</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-warn">
            <p>
              Nothing here is a recommendation to buy, sell or hold anything. &ldquo;Best to buy&rdquo;
              means the wrapper with the lowest all-in cost we could measure at the moment we
              measured it, and nothing more. It is a statement about two prices, not about whether
              you should own the underlying company.
            </p>
            <p>
              Prices move. A figure that was true when this page was generated may not be true when
              you read it. Verify before you transact, and never route a trade on a number you have
              not checked yourself.
            </p>
            <p>
              Tokenized equities carry risks that shares do not, including issuer credit risk,
              redemption restrictions, and the absence of shareholder rights. Par measures price. It
              does not assess any of those.
            </p>
          </div>
        </div>
      </Card>

      <Section title="What Par measures">
        <p>
          The same company is issued as several different tokens on Solana. Par tracks{" "}
          {allListings().length} stocks across {allMints().length} tokens, of which{" "}
          {multiIssuerListings().length} are issued by more than one issuer. For each, it compares
          the token price against the real share price, and works out which wrapper you can actually
          fill at size.
        </p>
        <p>
          Ranking is by all-in executable cost, not headline price. A token showing a better price on
          too little liquidity loses to a dearer one you can buy, because the better price was never
          available to you.
        </p>
      </Section>

      <Section title="How the reference price works">
        <p>
          Every premium is measured against the real share price from a market data provider, not
          against another token. Outside regular US trading hours there is no live share price, so
          the reference is the last close.
        </p>
        <p>
          Par never hides this. Every figure carries a basis that reads either{" "}
          <span className="text-ink">live</span> or something like{" "}
          <span className="text-ink">Mon, Sep 14 close</span>, and the interface prints it beside the
          number. An off-hours premium is real, and it is also partly the market pricing risk it
          cannot hedge until the open. Read it with that in mind.
        </p>
      </Section>

      <Section title="The multiplier, and who it affects">
        <p>
          These tokens handle splits and dividends through the Token-2022 scaled-UI multiplier. The
          mint stores a current multiplier next to a scheduled replacement; once the schedule passes,
          the stored field is stale and nothing updates it.
        </p>
        <p>
          This does not hurt holders. Solana applies the multiplier to{" "}
          <span className="font-mono text-ink">uiAmount</span>, so wallets show the right balance, and
          the market prices the raw token correctly, so swaps fill correctly. It hurts code that
          works in raw amounts, which is every on-chain program. See{" "}
          <Link href="/check" className="text-accent hover:underline">
            the integration check
          </Link>{" "}
          for a worked example.
        </p>
      </Section>

      <Section title="What Par does not cover">
        <p>
          Par tracks the issuers whose tokens have liquid markets on Solana DEXs. Other platforms
          issue tokenized equities that settle off-chain or through their own venues, and those are
          outside what an on-chain price comparison can see.
        </p>
        <p>
          Within what it does track, a stock only appears in the comparison table if more than one
          issuer lists it and at least one side holds enough liquidity to trade. That filter removes
          most of the catalogue, which is itself the point.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <p>
          Share prices from Finnhub. On-chain prices, liquidity and routing quotes from Jupiter. Mint
          state and wallet balances from Solana via Helius. Issuer catalogue and primary-market NAV
          from Ondo. History stored in Postgres and captured on a schedule.
        </p>
        <p>
          Finnhub&rsquo;s free tier is for non-commercial use, which is what this is. A production
          deployment would need a paid plan.
        </p>
      </Section>

      <Section title="Open by default">
        <p>
          Every number on this site is available through a public API with no key and no rate limit,
          documented with an OpenAPI spec. The{" "}
          <a
            href="https://github.com/RaymondAbiola/Par"
            className="text-accent hover:underline"
          >
            source is on GitHub
          </a>
          , and the SDK exports the multiplier logic as pure functions so you can fix your own code
          without depending on this service at all.
        </p>
      </Section>
    </div>
  );
}
