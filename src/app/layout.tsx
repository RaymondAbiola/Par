import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Par",
  description:
    "Fair-value and best-execution for tokenized equities on Solana. See what every stock token trades at relative to the real share.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
