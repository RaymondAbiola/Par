import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { SessionBadge } from "@/components/session-badge";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Monitor" },
  { href: "/history", label: "History" },
  { href: "/check", label: "Check" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-ground/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={20} className="shrink-0" />
            <span className="text-lg font-semibold tracking-tight">Par</span>
            <span className="hidden text-xs text-subtle sm:inline">tokenized equities, priced honestly</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted transition-colors hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <SessionBadge />
            <a
              href="/api/v1/tickers"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:inline"
            >
              API
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-xs leading-relaxed text-subtle">
          <p>
            Reference prices from Finnhub, on-chain prices and routing from Jupiter, mint state from
            Solana via Helius, issuer data from Ondo. Not investment advice.
          </p>
          <p className="mt-1">
            Outside regular trading hours the reference price is the last close, labelled as such.
            Finnhub&rsquo;s free tier is non-commercial.
          </p>
        </div>
      </footer>
    </div>
  );
}
