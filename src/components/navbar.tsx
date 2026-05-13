"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./theme-provider";

export function Navbar() {
  const router = useRouter();
  const { toggle } = useTheme();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const overHero = pathname === "/" && !scrolled;
  const showAppointmentsDot = hasAppointments && !pathname.startsWith("/mis-citas");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setUser(d.user);
        } else {
          setUser(null);
          setHasAppointments(false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/my/appointments?limit=1")
      .then((r) => r.json())
      .then((d) => {
        setHasAppointments(Array.isArray(d.items) && d.items.length > 0);
      })
      .catch(() => setHasAppointments(false));
  }, [user]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfileOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

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
          <span
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-playfair), serif", color: overHero ? "#f3f4f6" : "var(--text-primary)" }}
          >
            Filo <span className="text-[var(--accent)]">Estilo</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink href="/" light={overHero}>Inicio</NavLink>
          <NavLink href="/#servicios" light={overHero}>Servicios</NavLink>
          <NavLink href="/#equipo" light={overHero}>Equipo</NavLink>
          <NavLink href="/#contacto" light={overHero}>Contacto</NavLink>

          {user ? (
            <>
              {user.role === "admin" && <NavLink href="/admin/services" light={overHero}>Panel Admin</NavLink>}
            </>
          ) : (
            <NavLink href="/login" light={overHero}>Iniciar Sesión</NavLink>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            style={
              overHero
                ? { borderColor: "rgba(255,255,255,0.3)", background: "rgba(15,23,42,0.45)", color: "#e5e7eb" }
                : { borderColor: "var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-secondary)" }
            }
            aria-label="Cambiar tema"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>

          <Link href="/reservar" className="btn-gold text-sm !py-2.5 !px-6">
            Reservar Cita
          </Link>

          {user && (
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                aria-label="Menú de usuario"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {showAppointmentsDot && (
                  <span className="absolute -top-1 -right-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--bg-secondary)]" />
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-2xl">
                  <Link
                    href="/perfil"
                    onClick={() => setProfileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)]"
                  >
                    Mi Perfil
                  </Link>
                  <Link
                    href="/mis-citas"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)]"
                  >
                    <span>Mis Citas</span>
                    {showAppointmentsDot && <span className="inline-block h-2 w-2 rounded-full bg-red-500" />}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
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
              <MobileLink href="/perfil" onClick={() => setMenuOpen(false)}>Mi Perfil</MobileLink>
              <MobileLink href="/mis-citas" onClick={() => setMenuOpen(false)} showDot={showAppointmentsDot}>Mis Citas</MobileLink>
              {user.role === "admin" && (
                <MobileLink href="/admin/services" onClick={() => setMenuOpen(false)}>Panel Admin</MobileLink>
              )}
              <button
                onClick={handleLogout}
                className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400"
              >
                Cerrar sesión
              </button>
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

function NavLink({
  href,
  children,
  light = false,
  showDot = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
  showDot?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative text-sm hover:text-[var(--accent)] transition-colors duration-200"
      style={{ color: light ? "#e5e7eb" : "var(--text-secondary)" }}
    >
      {children}
      {showDot && (
        <span className="absolute -top-1.5 -right-2.5 inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--bg-secondary)]" />
      )}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
  showDot = false,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  showDot?: boolean;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
      <span>{children}</span>
      {showDot && <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />}
    </Link>
  );
}
