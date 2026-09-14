import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Premium, Spread } from "@/components/premium";
import { Stat, StatRow } from "@/components/ui/stat";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="py-6">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The same stock has two prices on Solana.
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          Every US equity here is issued as several different tokens, each with its own liquidity and
          its own price. Par measures what each one trades at against the real share, and which is
          actually cheapest to buy.
        </p>
      </section>

      <Card>
        <CardHeader title="Design system" hint="Placeholder until the monitor lands in the next commit" />
        <StatRow>
          <Stat label="Listings" value="443" detail="tokenized equities tracked" />
          <Stat label="Wrappers" value="656" detail="across two issuers" />
          <Stat label="Stale multipliers" value="105" tone="warn" detail="stored value no longer correct" />
          <Stat label="Widest spread" value="5.89pp" tone="warn" detail="same stock, two prices" />
        </StatRow>
      </Card>

      <Card>
        <CardHeader title="Primitives" />
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          <Premium bps={-212} />
          <Premium bps={552} />
          <Premium bps={0} />
          <Premium bps={null} />
          <Spread bps={589} />
          <Spread bps={34} />
          <Badge>xStocks</Badge>
          <Badge tone="accent">best price</Badge>
          <Badge tone="warn">stale multiplier</Badge>
          <Badge tone="neutral" mono>
            $1,773,937
          </Badge>
        </div>
      </Card>
    </div>
  );
}
