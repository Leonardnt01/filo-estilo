export default function LoadingPerfilPage() {
  return (
    <main className="flex-1 pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
          <div className="h-10 w-64 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
          <div className="h-4 w-80 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="h-6 w-48 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              <div className="mt-5 space-y-4">
                <div className="h-12 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                <div className="h-12 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                <div className="h-12 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="h-6 w-40 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              <div className="mt-4 space-y-3">
                <div className="h-20 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                <div className="h-20 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-card grid grid-cols-2 gap-3 p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
              ))}
            </div>
            <div className="glass-card p-6">
              <div className="h-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
