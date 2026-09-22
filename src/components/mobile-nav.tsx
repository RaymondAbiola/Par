"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // navigating should close the panel, otherwise it hangs over the new page
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex size-9 shrink-0 items-center justify-center rounded border border-line text-muted transition-colors hover:border-line-strong hover:text-ink md:hidden"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-line bg-ground md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b border-line/60 py-3 text-base last:border-0 ${
                    active ? "font-medium text-ink" : "text-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/v1/ticker/NVDA" className="border-t border-line/60 py-3 font-mono text-sm text-muted">
              API
            </a>

          </nav>
        </div>
      ) : null}
    </>
  );
}
