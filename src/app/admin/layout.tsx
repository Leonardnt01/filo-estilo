"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Helper to check if a navigation item is active
  const isActiveLink = (href: string) => {
    return pathname === href || (href !== "/admin" && pathname.startsWith(href));
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="space-y-6 px-6">
        {/* Logo and Brand Title */}
        <div className="flex items-center gap-3">
          <Link href="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 group">
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
            <span className="text-xl font-bold tracking-tight transition-colors" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--text-primary)" }}>
              Filo <span className="text-[var(--accent)]">Estilo</span>
            </span>
          </Link>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
            Admin
          </span>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent" />

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 rounded-2xl px-4.5 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "shadow-lg shadow-[var(--accent-soft)]/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)]"
                }`}
                style={
                  active
                    ? { 
                        background: "var(--accent-soft)", 
                        color: "var(--accent)", 
                        border: "1.5px solid var(--accent-border)",
                        boxShadow: "0 4px 12px rgba(212,168,67,0.05)"
                      }
                    : { 
                        border: "1.5px solid transparent",
                      }
                }
              >
                <svg className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-4 px-6 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] font-medium">Modo visual</span>
          <ThemeToggle />
        </div>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-sm font-bold transition-all hover:text-[var(--accent)] active:scale-95 text-center w-full"
          style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ver Página Web
        </Link>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* 1. PERSISTENT SIDEBAR FOR DESKTOP (lg screens and up) */}
      <aside 
        className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 z-40 border-r"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <SidebarContent />
      </aside>

      {/* 2. MOBILE SIDEBAR DRAWER AND BACKDROP (controlled by sidebarOpen state) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          />

          {/* Drawer Panel */}
          <aside 
            className="relative flex flex-col w-72 max-w-xs h-full border-r shadow-2xl animate-slide-in"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
          >
            <div className="absolute right-4 top-5">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 3. MAIN WORKSPACE / CONTENT AREA */}
      <div className="flex-1 min-w-0 lg:pl-72 flex flex-col">
        {/* Top Control Bar inside Content Area */}
        <header 
          className="sticky top-0 z-30 border-b flex items-center justify-between px-6 py-4 backdrop-blur-md"
          style={{ borderColor: "var(--border)", background: "rgba(11, 11, 16, 0.72)" }}
        >
          {/* Hamburger toggle button & current view title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] hover:brightness-105 active:scale-95 lg:hidden"
              aria-label="Toggle Menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden lg:block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">Panel de Gestión</span>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-playfair), serif" }}>
                {navItems.find(item => isActiveLink(item.href))?.label || "Administración"}
              </h1>
            </div>
            <div className="lg:hidden flex items-center gap-1.5">
              <span className="text-sm font-bold text-[var(--text-primary)] font-display">Filo <span className="text-[var(--accent)]">Estilo</span></span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">Admin</span>
            </div>
          </div>

          {/* Quick controls in top header */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver Web
            </Link>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Content Area Render */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
