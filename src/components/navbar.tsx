"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./theme-provider";
import { useAuthModal } from "./auth-modal";

type UserInfo = { email: string; role: string; is_staff?: boolean };

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useTheme();
  const { open } = useAuthModal();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.authenticated ? d.user : null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const sections = [
      { id: "quienes", key: "quienes" },
      { id: "servicios", key: "servicios" },
      { id: "casos", key: "casos" },
      { id: "contacto", key: "contacto" },
    ];

    const detectSection = () => {
      if (window.scrollY < 220) {
        setActiveSection("inicio");
        return;
      }

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 140 && rect.bottom >= 140) {
          setActiveSection(section.key);
          return;
        }
      }
    };

    detectSection();
    window.addEventListener("scroll", detectSection);
    return () => window.removeEventListener("scroll", detectSection);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfileOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const overHero = pathname === "/" && !scrolled;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl border-b"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: overHero ? "rgba(5,8,17,0.62)" : "var(--nav-bg-scroll)",
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg
            className="h-8 w-8 text-[var(--accent)] transition-transform duration-500 group-hover:rotate-[28deg]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          <span
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-playfair), serif", color: "#f3f4f6" }}
          >
            Filo <span className="text-[var(--accent)]">Estilo</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-full border px-2 py-1.5"
          style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(10,14,28,0.5)" }}>
          <NavLink href="/" active={pathname === "/" && activeSection === "inicio"}>Inicio</NavLink>
          <NavLink href="/sedes" active={pathname.startsWith("/sedes")}>Sedes</NavLink>
          <NavLink href="/#quienes" active={pathname === "/" && activeSection === "quienes"}>Quiénes Somos</NavLink>
          <NavLink href="/#servicios" active={pathname === "/" && activeSection === "servicios"}>Servicios</NavLink>
          <NavLink href="/#casos" active={pathname === "/" && activeSection === "casos"}>Casos</NavLink>
          <NavLink href="/#contacto" active={pathname === "/" && activeSection === "contacto"}>Contacto</NavLink>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            style={{ borderColor: "rgba(255,255,255,0.28)", background: "rgba(10,14,28,0.55)", color: "#e5e7eb" }}
            aria-label="Cambiar tema"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>

          {!user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => open("login")}
                className="rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent)] transition-colors"
              >
                Iniciar sesión
              </button>
              <button onClick={() => open("register")} className="btn-gold text-sm !py-2 !px-5">
                Registrarme
              </button>
            </div>
          )}

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
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-2xl">
                  <Link href="/perfil" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)]">
                    Mi Perfil
                  </Link>
                  <Link href="/mis-citas" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)]">
                    Mis Citas
                  </Link>
                  <button onClick={handleLogout} className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400">
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors" aria-label="Menú">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden backdrop-blur-md border-t border-[var(--border)] px-6 py-4 space-y-1 animate-fade-in"
          style={{ background: "var(--nav-bg-scroll)" }}>
          <MobileLink href="/" onClick={() => setMenuOpen(false)}>Inicio</MobileLink>
          <MobileLink href="/sedes" onClick={() => setMenuOpen(false)}>Sedes</MobileLink>
          <MobileLink href="/#quienes" onClick={() => setMenuOpen(false)}>Quiénes Somos</MobileLink>
          <MobileLink href="/#servicios" onClick={() => setMenuOpen(false)}>Servicios</MobileLink>
          <MobileLink href="/#casos" onClick={() => setMenuOpen(false)}>Casos</MobileLink>
          <MobileLink href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</MobileLink>
          {!user ? (
            <>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  open("login");
                }}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                Iniciar sesión
              </button>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    open("register");
                  }}
                  className="btn-gold w-full text-center"
                >
                  Registrarme
                </button>
              </div>
            </>
          ) : (
            <>
              <MobileLink href="/perfil" onClick={() => setMenuOpen(false)}>Mi Perfil</MobileLink>
              <MobileLink href="/mis-citas" onClick={() => setMenuOpen(false)}>Mis Citas</MobileLink>
              <button onClick={handleLogout} className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${active ? "text-[var(--accent)]" : "text-[#e5e7eb] hover:text-[var(--accent)]"}`}
      style={active ? { background: "var(--accent-soft)" } : undefined}
    >
      {children}
      {active && <span className="absolute left-3 right-3 -bottom-[2px] h-px bg-[var(--accent)] opacity-80" />}
    </Link>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
      <span>{children}</span>
    </Link>
  );
}
