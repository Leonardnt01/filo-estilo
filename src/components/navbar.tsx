"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

export function Navbar() {
  const { toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.authenticated) setUser(d.user); })
      .catch(() => {});
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
      style={scrolled ? { background: "var(--nav-bg-scroll)" } : undefined}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg
            className="h-8 w-8 text-[var(--accent)] transition-transform duration-500 group-hover:rotate-[30deg]"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          <span className="text-xl font-bold tracking-wide" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Filo <span className="text-[var(--accent)]">Estilo</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/#servicios">Servicios</NavLink>
          <NavLink href="/#equipo">Equipo</NavLink>
          <NavLink href="/#contacto">Contacto</NavLink>

          {user ? (
            <>
              {user.role === "admin" && <NavLink href="/admin/services">Panel Admin</NavLink>}
              <NavLink href="/mis-citas">Mis Citas</NavLink>
            </>
          ) : (
            <NavLink href="/login">Iniciar Sesión</NavLink>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            aria-label="Cambiar tema"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>

          <Link href="/reservar" className="btn-gold text-sm !py-2.5 !px-6">
            Reservar Cita
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            aria-label="Cambiar tema"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            aria-label="Menú"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden backdrop-blur-md border-t border-[var(--border)] px-6 py-4 space-y-1 animate-fade-in"
          style={{ background: "var(--nav-bg-scroll)" }}>
          <MobileLink href="/" onClick={() => setMenuOpen(false)}>Inicio</MobileLink>
          <MobileLink href="/#servicios" onClick={() => setMenuOpen(false)}>Servicios</MobileLink>
          <MobileLink href="/#equipo" onClick={() => setMenuOpen(false)}>Equipo</MobileLink>
          <MobileLink href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</MobileLink>
          {user ? (
            <>
              <MobileLink href="/mis-citas" onClick={() => setMenuOpen(false)}>Mis Citas</MobileLink>
              {user.role === "admin" && (
                <MobileLink href="/admin/services" onClick={() => setMenuOpen(false)}>Panel Admin</MobileLink>
              )}
            </>
          ) : (
            <MobileLink href="/login" onClick={() => setMenuOpen(false)}>Iniciar Sesión</MobileLink>
          )}
          <div className="pt-2">
            <Link href="/reservar" onClick={() => setMenuOpen(false)} className="btn-gold w-full text-center">
              Reservar Cita
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-200">
      {children}
    </Link>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
      {children}
    </Link>
  );
}
