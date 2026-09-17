import type { Metadata } from "next";
import { getStaleExample } from "@/core/portfolio/demo";
import { WalletLookup } from "@/components/check/wallet-lookup";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { truncateAddress } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Integration check",
  description:
    "Tokenized equities on Solana rebase through a scaled-UI multiplier. Read the raw amount without it and you are off by up to ten times.",
};

function Num({ children, tone }: { children: React.ReactNode; tone?: "good" | "bad" }) {
  const colour = tone === "good" ? "text-discount" : tone === "bad" ? "text-premium" : "text-ink";
  return <span className={`tnum font-medium ${colour}`}>{children}</span>;
}

export default async function CheckPage() {
  const example = await getStaleExample().catch(() => null);
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div className="space-y-6">
      <section className="py-4">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          If you read the raw balance, you are off by ten times.
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Tokenized equities on Solana handle splits and dividends with the Token-2022 scaled-UI
          multiplier. The RPC applies it to <code className="font-mono text-xs">uiAmount</code>, so
          reading that is safe. Anything touching the raw{" "}
          <code className="font-mono text-xs">amount</code>, which means routing, pool maths and your
          own accounting, has to apply it by hand. And the multiplier stored on the mint is not the
          one in force.
        </p>
      </section>

      {example ? (
        <Card>
          <CardHeader
            title={`Worked example: ${example.symbol}`}
            hint={`A real account holding ${example.ticker}, read live from mainnet`}
            action={<Badge tone="warn">{example.factor.toFixed(0)}x error</Badge>}
          />

          <div className="space-y-3 px-4 py-4 text-sm">
            <p className="text-muted">
              Account <span className="font-mono text-xs text-ink">{truncateAddress(example.account, 6)}</span>{" "}
              holds a raw balance of{" "}
              <span className="tnum text-ink">{example.rawAmount}</span> at {example.decimals} decimals.
            </p>

            <div className="grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3">
              <div className="bg-surface px-3 py-2.5">
                <div className="text-xs tracking-wide text-subtle uppercase">Correct</div>
                <div className="mt-1 text-lg">
                  <Num tone="good">{fmt(example.correctShares)}</Num>
                </div>
                <div className="mt-0.5 text-xs text-subtle">multiplier {example.effective}</div>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <div className="text-xs tracking-wide text-subtle uppercase">Raw ÷ decimals</div>
                <div className="mt-1 text-lg">
                  <Num tone="bad">{fmt(example.naiveShares)}</Num>
                </div>
                <div className="mt-0.5 text-xs text-subtle">multiplier ignored</div>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <div className="text-xs tracking-wide text-subtle uppercase">Mint&rsquo;s stored field</div>
                <div className="mt-1 text-lg">
                  <Num tone="bad">{fmt(example.storedFieldShares)}</Num>
                </div>
                <div className="mt-0.5 text-xs text-subtle">reads {example.stored}, stale</div>
              </div>
            </div>

            <p className="leading-relaxed text-muted">
              The last two are the same number, and both are wrong. Reaching for the mint&rsquo;s own{" "}
              <code className="font-mono text-xs">multiplier</code> field to correct the first mistake
              does not help, because a scheduled change has already taken effect
              {example.effectiveFrom
                ? ` on ${new Date(example.effectiveFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                : ""}{" "}
              and that field was never updated. You have to compare{" "}
              <code className="font-mono text-xs">newMultiplierEffectiveTimestamp</code> against the
              clock yourself.
            </p>

            {example.rpcUiAmount !== null ? (
              <p className="text-xs text-subtle">
                Cross-check: the RPC reports <span className="tnum">{fmt(example.rpcUiAmount)}</span> for
                this account, matching the correct column.
              </p>
            ) : null}

            <div className="rounded border border-line bg-raised px-3 py-2.5">
              <div className="text-xs font-medium">Where this actually bites</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Not in wallets. Solana applies the multiplier to{" "}
                <code className="font-mono">uiAmount</code>, so a holder sees the right balance and the
                market prices the raw token correctly when they trade.
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                It bites on chain, where balances are raw and oracles quote per share. A lending
                protocol computing{" "}
                <code className="font-mono">raw_amount &times; oracle_price</code> values this position
                at a tenth of its worth, so a borrower who should draw $19,000 against it draws
                $1,900. Invert the same mistake and the protocol lends ten times too much. Indexers
                and analytics hit it too, because{" "}
                <code className="font-mono">getProgramAccounts</code> hands you raw amounts.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="px-4 py-10 text-center text-sm text-muted">
            Mint state is temporarily unavailable. This page refreshes automatically.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Check a wallet"
          hint="Values every tokenized equity it holds, both ways"
        />
        <WalletLookup />
      </Card>

      <Card>
        <CardHeader title="Getting it right" />
        <pre className="overflow-x-auto px-4 py-4 font-mono text-sm leading-relaxed text-muted">
{`const now = Math.floor(Date.now() / 1000);

// the stored field is only current until the scheduled change lands
const multiplier =
  now >= config.newMultiplierEffectiveTimestamp
    ? config.newMultiplier
    : config.multiplier;

const shares = Number(rawAmount) / 10 ** decimals * multiplier;`}
        </pre>
        <p className="border-t border-line px-4 py-2.5 text-xs text-subtle">
          Or use the API: <code className="font-mono">GET /api/v1/multipliers</code> returns every
          wrapper whose stored field is stale.
        </p>
      </Card>
    </div>
  );
}
