import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Par", template: "%s · Par" },
  description:
    "Fair-value and best-execution for tokenized equities on Solana. See what every stock token trades at relative to the real share, and which wrapper is actually cheapest.",
  metadataBase: new URL("https://par-sigma.vercel.app"),
  openGraph: {
    title: "Par",
    description:
      "The same stock has more than one price on Solana. Par measures every tokenized wrapper against the real share, and says which one you can actually buy.",
    type: "website",
    siteName: "Par",
  },
  twitter: {
    card: "summary_large_image",
    title: "Par",
    description:
      "The same stock has more than one price on Solana. Fair value and best execution for tokenized equities.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* runs before first paint so an explicit choice does not flash the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("par-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
