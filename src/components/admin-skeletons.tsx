"use client";

export function AdminHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="skeleton h-8 w-72" />
        <div className="skeleton h-4 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <div className="skeleton skeleton-chip w-48" />
        <div className="skeleton skeleton-chip w-36" />
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-card !p-0 overflow-hidden">
      <div className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-[var(--border)]">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
            <div className="space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton skeleton-chip w-20" />
            <div className="flex gap-2">
              <div className="skeleton skeleton-chip w-16" />
              <div className="skeleton skeleton-chip w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="admin-card flex flex-col items-center text-center">
          <div className="skeleton skeleton-circle h-20 w-20" />
          <div className="mt-3 space-y-2 w-full flex flex-col items-center">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-28" />
            <div className="skeleton skeleton-chip w-20 mt-1" />
          </div>
          <div className="mt-4 flex gap-2 w-full">
            <div className="skeleton skeleton-chip flex-1" />
            <div className="skeleton skeleton-chip flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminAppointmentsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-card flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="skeleton skeleton-circle h-14 w-14 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton skeleton-chip w-20" />
            </div>
            <div className="flex gap-4">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-28" />
            </div>
          </div>
          <div className="skeleton skeleton-chip w-32 h-9" />
        </div>
      ))}
    </div>
  );
}
