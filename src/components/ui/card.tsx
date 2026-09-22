import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-card ${
        hover ? "transition-shadow duration-200 hover:shadow-lift" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
