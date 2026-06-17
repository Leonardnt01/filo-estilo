export default function LoadingMisCitasPage() {
  return (
    <main className="flex-1 pt-28 pb-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
          <div className="h-10 w-52 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="glass-card p-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="h-20 w-20 animate-pulse rounded-2xl bg-[var(--bg-surface-hover)]" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-56 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                  <div className="h-4 w-72 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                  <div className="h-10 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                </div>
                <div className="h-8 w-28 animate-pulse rounded-full bg-[var(--bg-surface-hover)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
