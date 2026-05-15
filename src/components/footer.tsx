import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
              <span className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Filo <span className="text-[var(--accent)]">Estilo</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
              Tu barbería de confianza. Estilo, precisión y atención personalizada en cada visita.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Navegación</h3>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Inicio</Link></li>
              <li><Link href="/sedes" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Sedes</Link></li>
              <li><Link href="/#servicios" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Servicios</Link></li>
              <li><Link href="/#equipo" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Quiénes Somos</Link></li>
              <li><Link href="/reservar" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Reservar Cita</Link></li>
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Cuenta</h3>
            <ul className="space-y-2.5">
              <li><Link href="/login" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Iniciar Sesión</Link></li>
              <li><Link href="/register" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Registrarse</Link></li>
              <li><Link href="/mis-citas" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Mis Citas</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                <svg className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Av. Arequipa 2450, Lince, Lima
              </li>
              <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                <svg className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +51 999 999 999
              </li>
              <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                <svg className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 32 32">
                  <path d="M19.11 17.205c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.148-1.255-.463-2.39-1.475-.883-.788-1.48-1.762-1.653-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.148-.174.198-.298.297-.497.1-.198.05-.372-.024-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479s1.064 2.875 1.213 3.074c.148.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.695.625.711.227 1.36.195 1.87.118.572-.085 1.758-.718 2.006-1.412.248-.694.248-1.29.174-1.413-.075-.124-.273-.198-.57-.347z" />
                </svg>
                WhatsApp: +51 999 999 999
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Filo Estilo. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <SocialIcon label="Instagram" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            <SocialIcon label="Facebook" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            <SocialIcon label="WhatsApp" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ label, d }: { label: string; d: string }) {
  const links: Record<string, string> = {
    Instagram: "https://instagram.com",
    Facebook: "https://facebook.com",
    WhatsApp: "https://wa.me/51999999999",
  };
  return (
    <a
      href={links[label] ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      aria-label={label}
    >
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d={d} /></svg>
    </a>
  );
}
