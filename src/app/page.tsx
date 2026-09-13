export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight">Par</h1>
        <p className="mt-3 text-lg text-[var(--color-muted)]">
          Fair-value and best-execution for tokenized equities on Solana.
        </p>
      </div>
      <p className="max-w-xl leading-relaxed text-[var(--color-muted)]">
        The same stock trades at different prices across issuers, and nothing tells you what you are
        paying over the real share. Par measures the gap.
      </p>
    </main>
  );
}
