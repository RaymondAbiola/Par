import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { MobileNav, type NavItem } from "@/components/mobile-nav";
import { SessionBadge } from "@/components/session-badge";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV: NavItem[] = [
  { href: "/", label: "Monitor" },
  { href: "/history", label: "History" },
  { href: "/check", label: "Check" },
  { href: "/about", label: "About" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/90 backdrop-blur">
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3.5 sm:gap-6">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2.5">
            <Logo size={24} className="shrink-0" />
            <span className="text-xl font-semibold tracking-tight sm:text-2xl">Par</span>
            <span className="hidden text-[13px] text-subtle lg:inline">
              tokenized equities, priced honestly
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-[15px] md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted transition-colors hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <SessionBadge compact />
            {/* an api route returning json, not a page */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/v1/ticker/NVDA"
              className="hidden text-[15px] text-muted transition-colors hover:text-ink lg:inline"
            >
              API
            </a>
            <ThemeToggle />
            <MobileNav items={NAV} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-xs leading-relaxed text-subtle">
          <p>
            Reference prices from Finnhub, on-chain prices and routing from Jupiter, mint state from
            Solana via Helius, issuer data from Ondo.
          </p>
          <p className="mt-1">
            Outside regular trading hours the reference price is the last close, labelled as such.
          </p>
          <p className="mt-2">
            <Link href="/about" className="text-muted underline underline-offset-2 hover:text-ink">
              Not investment advice
            </Link>
            . Par measures prices. It holds no funds and executes no trades.
          </p>
        </div>
      </footer>
    </div>
  );
}
