"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthModal } from "./auth-modal";
import { ThemeToggle } from "./theme-toggle";

type UserInfo = { email: string; role: string; is_staff?: boolean };

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
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
    if (!menuOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
        borderColor: "var(--border)",
        background: (overHero && !menuOpen) ? "rgba(5,8,17,0.62)" : "var(--nav-bg-scroll)",
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--accent)] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
            <svg
              className="relative h-9 w-9 text-[var(--accent)] transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110"
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
          <span
            className="text-2xl font-bold tracking-tight transition-colors"
            style={{ 
              fontFamily: "var(--font-playfair), serif", 
              color: overHero ? "#f5f5f7" : "var(--text-primary)" 
            }}
          >
            Filo <span className="text-[var(--accent)]">Estilo</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-md transition-all"
          style={{ 
            borderColor: overHero ? "rgba(255,255,255,0.15)" : "var(--border-strong)", 
            background: overHero ? "rgba(255,255,255,0.05)" : "var(--bg-surface)", 
            opacity: 0.95 
          }}>
          <NavLink href="/" active={pathname === "/" && activeSection === "inicio"} overHero={overHero}>Inicio</NavLink>
          <NavLink href="/#quienes" active={pathname === "/" && activeSection === "quienes"} overHero={overHero}>Quiénes Somos</NavLink>
          <NavLink href="/sedes" active={pathname.startsWith("/sedes")} overHero={overHero}>Sedes</NavLink>
          <NavLink href="/#servicios" active={pathname === "/" && activeSection === "servicios"} overHero={overHero}>Servicios</NavLink>
          <NavLink href="/#casos" active={pathname === "/" && activeSection === "casos"} overHero={overHero}>Casos</NavLink>
          <NavLink href="/#contacto" active={pathname === "/" && activeSection === "contacto"} overHero={overHero}>Contacto</NavLink>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

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

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] transition-transform active:scale-90" 
            aria-label="Menú"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 z-[90] border-b border-[var(--border)] bg-[var(--nav-bg-scroll)] shadow-2xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 max-h-[calc(100vh-76px)] overflow-y-auto">
            <div className="space-y-2">
            <MobileLink href="/" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2"/></svg>}>Inicio</MobileLink>
            <MobileLink href="/sedes" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>}>Sedes</MobileLink>
            <MobileLink href="/#quienes" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2"/></svg>}>Quiénes Somos</MobileLink>
            <MobileLink href="/#servicios" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" strokeWidth="2"/></svg>}>Servicios</MobileLink>
            <MobileLink href="/#casos" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeWidth="2"/></svg>}>Casos</MobileLink>
            <MobileLink href="/#contacto" onClick={() => setMenuOpen(false)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2"/></svg>}>Contacto</MobileLink>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-strong)] space-y-4">
              {!user ? (
                <div className="grid gap-3">
                  <button
                    onClick={() => { setMenuOpen(false); open("login"); }}
                    className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-3.5 text-center text-base font-semibold text-[var(--text-secondary)] active:scale-95 transition-all"
                  >
                    Iniciar sesión
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); open("register"); }}
                    className="btn-gold w-full py-3.5 text-center text-base font-bold shadow-xl active:scale-95 transition-all"
                  >
                    Registrarme ahora
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Link href="/perfil" onClick={() => setMenuOpen(false)} className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-3.5 text-center text-base font-semibold text-[var(--text-secondary)]">Mi Perfil</Link>
                  <button onClick={handleLogout} className="w-full rounded-2xl bg-red-500/10 py-3.5 text-center text-base font-semibold text-red-400">Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, overHero, children }: { href: string; active?: boolean; overHero?: boolean; children: React.ReactNode }) {
  const textColor = overHero 
    ? (active ? "var(--accent)" : "#e5e7eb") 
    : (active ? "text-[var(--accent)]" : "text-[var(--text-secondary)]");

  return (
    <Link
      href={href}
      className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${overHero ? "" : textColor} hover:text-[var(--accent)]`}
      style={{ 
        background: active ? "var(--accent-soft)" : "transparent",
        color: overHero ? (active ? "var(--accent)" : "#e5e7eb") : undefined
      }}
    >
      {children}
      {active && <span className="absolute left-3 right-3 -bottom-[2px] h-px bg-[var(--accent)] opacity-80" />}
    </Link>
  );
}

function MobileLink({ href, onClick, icon, children }: { href: string; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      onClick={onClick} 
      className="flex items-center justify-between group rounded-2xl px-4 py-4 text-lg font-medium text-[var(--text-secondary)] active:bg-[var(--accent-soft)] active:text-[var(--accent)] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] group-active:text-[var(--accent)] group-active:border-[var(--accent-border)] transition-colors">
          {icon}
        </div>
        <span>{children}</span>
      </div>
      <svg className="h-5 w-5 text-[var(--text-muted)] group-active:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
