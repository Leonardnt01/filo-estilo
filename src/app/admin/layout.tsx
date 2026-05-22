"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/admin/services", label: "Servicios", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/admin/barbers", label: "Barberos", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/admin/business-hours", label: "Horarios", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/appointments", label: "Citas", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/staff", label: "Staff", icon: "M17 20h5V9H2v11h5m10 0v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0H7m10-10V4a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0H7" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)]" style={{ background: "var(--bg-secondary)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--accent)] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                <svg
                  className="relative h-7 w-7 text-[var(--accent)] transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M18 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M12 12 3 3" />
                  <path d="M12 12l9-9" />
                  <path d="M12 12v10" />
                  <path d="m15 19-3 3-3-3" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight transition-colors" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--text-primary)" }}>
                Filo <span className="text-[var(--accent)]">Estilo</span>
              </span>
            </Link>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors hover:text-[var(--accent)]"
              style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
            >
              Ver Página Web
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Navigation tabs */}
        <nav className="mb-8 flex flex-wrap gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all ${
                  isActive
                    ? "font-semibold"
                    : "hover:text-[var(--accent)]"
                }`}
                style={
                  isActive
                    ? { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }
                    : { color: "var(--text-secondary)", border: "1px solid var(--border-strong)", background: "var(--bg-surface)" }
                }
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
