export default function LoadingSedeDetallePage() {
  return (
    <main className="pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 glass-card overflow-hidden">
          <div className="h-64 w-full animate-pulse bg-[var(--bg-surface-hover)]" />
          <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
            <div className="space-y-3">
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              <div className="h-10 w-64 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              <div className="h-4 w-72 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              <div className="h-4 w-40 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
            </div>
            <div className="h-36 animate-pulse rounded-2xl bg-[var(--bg-surface-hover)]" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="glass-card overflow-hidden">
              <div className="h-44 w-full animate-pulse bg-[var(--bg-surface-hover)]" />
              <div className="p-5 space-y-3">
                <div className="h-6 w-48 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
