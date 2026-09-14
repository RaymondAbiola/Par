"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];
const STORAGE_KEY = "par-theme";

const LABEL: Record<Theme, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function Icon({ theme }: { theme: Theme }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (theme === "light") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common} aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let stored: Theme = "system";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark") stored = raw;
    } catch {
      // private browsing or blocked storage: fall back to following the system
    }
    setTheme(stored);
  }, []);

  function cycle() {
    const current = theme ?? "system";
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";
    setTheme(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // choice just will not persist
    }
  }

  if (!theme) return <span className="size-7" aria-hidden />;

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[theme]}
      aria-label={`Theme: ${LABEL[theme]}. Click to change.`}
      className="flex size-7 items-center justify-center rounded border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <Icon theme={theme} />
    </button>
  );
}
