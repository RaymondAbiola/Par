import { ImageResponse } from "next/og";
import { allListings, allMints, multiIssuerListings } from "@/core/registry";

export const alt = "Par: the same stock has more than one price on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori needs an explicit display on every element that has more than one child
const row = { display: "flex" } as const;
const col = { display: "flex", flexDirection: "column" } as const;

// counts come from the committed registry, so this never needs the network to render
export default function OpengraphImage() {
  const stats = [
    { value: String(allListings().length), label: "stocks tracked" },
    { value: String(allMints().length), label: "tokens" },
    { value: String(multiIssuerListings().length), label: "issued more than once" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          ...col,
          width: "100%",
          height: "100%",
          justifyContent: "space-between",
          background: "#0b0b0d",
          color: "#f2f2f0",
          padding: 72,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ ...row, alignItems: "center", gap: 18 }}>
          <svg width="62" height="62" viewBox="0 0 20 20" fill="none">
            <line x1="13" y1="2.5" x2="13" y2="17.5" stroke="#f2f2f0" strokeWidth="1.25" opacity="0.4" />
            <line x1="3" y1="7" x2="9.5" y2="7" stroke="#f2f2f0" strokeWidth="2.25" strokeLinecap="round" />
            <line x1="3" y1="13" x2="16.5" y2="13" stroke="#f2f2f0" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
          <div style={{ ...row, fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>Par</div>
        </div>

        <div style={{ ...col, gap: 22 }}>
          <div style={{ ...row, fontSize: 64, fontWeight: 600, lineHeight: 1.12, letterSpacing: -2, maxWidth: 950 }}>
            The same stock has more than one price on Solana.
          </div>
          <div style={{ ...row, fontSize: 29, color: "#9b9ba4", maxWidth: 1056, lineHeight: 1.45 }}>
            Which wrapper you can actually buy, measured against the real share price.
          </div>
        </div>

        <div style={{ ...row, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ ...row, gap: 56 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ ...col, gap: 6 }}>
                <div style={{ ...row, fontSize: 40, fontWeight: 600 }}>{s.value}</div>
                <div style={{ ...row, fontSize: 20, color: "#6c6c76" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ ...row, fontSize: 22, color: "#6c6c76" }}>par-sigma.vercel.app</div>
        </div>
      </div>
    ),
    size,
  );
}
