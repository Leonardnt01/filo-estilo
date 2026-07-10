"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};

type BranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type FooterProps = {
  initialSettings?: FooterSettings;
  initialBranchContact?: BranchContact | null;
};

export function Footer({ initialSettings, initialBranchContact = null }: FooterProps) {
  const pathname = usePathname();
  const settings = initialSettings ?? {};
  const branchContact = initialBranchContact;
  const isHomePage = pathname === "/";

  const brandName = settings.brand_name?.trim() || "Filo Estilo";
  const [brandMain, ...rest] = brandName.split(" ");
  const brandAccent = rest.join(" ") || "Estilo";

  const mainPhone = settings.phone?.trim() || branchContact?.phone?.trim() || "+51 999 999 999";
  const mainWa = settings.whatsapp?.trim() || branchContact?.whatsapp?.trim() || "+51 999 999 999";
  const mainAddress = settings.address?.trim() || branchContact?.address?.trim() || "Presencia en múltiples sedes";

  const links = {
    Instagram: settings.instagram?.trim() || "",
    Facebook: settings.facebook?.trim() || "",
    WhatsApp: `https://wa.me/${mainWa.replace(/\D/g, "") || "51999999999"}`,
  };
  const visibleSocials = [
    { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" },
    { label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
    { label: "WhatsApp", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479" },
  ].filter((item) => item.label === "WhatsApp" || Boolean(links[item.label as keyof typeof links]));

  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            {isHomePage ? (
              <div className="flex items-center gap-3 group">
                <FooterBrand brandAccent={brandAccent} brandMain={brandMain} />
              </div>
            ) : (
              <Link href="/#inicio" className="flex items-center gap-3 group">
                <FooterBrand brandAccent={brandAccent} brandMain={brandMain} />
              </Link>
            )}
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-[var(--text-muted-strong)]">
              Redefiniendo el estándar del cuidado masculino. Maestría técnica y atención personalizada en cada visita.
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Navegación</p>
            <ul className="space-y-2.5">
              <li><Link href="/#inicio" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Inicio</Link></li>
              <li><Link href="/sedes" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Nuestras Sedes</Link></li>
              <li><Link href="/#servicios" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Servicios Premium</Link></li>
              <li><Link href="/#quienes" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Quiénes Somos</Link></li>
              <li><Link href="/reservar" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Reservar Cita</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Cuenta</p>
            <ul className="space-y-2.5">
              <li><Link href="/login" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Iniciar Sesión</Link></li>
              <li><Link href="/register" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Registrarse</Link></li>
              <li><Link href="/mis-citas" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Mis Citas</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Legal</p>
            <ul className="space-y-2.5">
              <li><Link href="/terminos-condiciones" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Términos y Condiciones</Link></li>
              <li><Link href="/politica-cambios-devoluciones" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Política de Cambios y Devoluciones</Link></li>
              <li><Link href="/libro-de-reclamaciones" className="text-sm text-[var(--text-muted-strong)] hover:text-[var(--accent)]">Libro de Reclamaciones</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contacto Central</p>
            <ul className="space-y-3">
              <li className="text-sm text-[var(--text-muted-strong)]">{mainAddress}</li>
              <li className="text-sm text-[var(--text-muted-strong)]">{mainPhone}</li>
              <li className="text-sm text-[var(--text-muted-strong)]">WhatsApp: {mainWa}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted-strong)]">© {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            {visibleSocials.map((social) => (
              <SocialIcon key={social.label} label={social.label} links={links} d={social.path} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ label, d, links }: { label: string; d: string; links: Record<string, string> }) {
  return (
    <a href={links[label] ?? "#"} target="_blank" rel="noreferrer" className="text-[var(--text-muted-strong)] hover:text-[var(--accent)]">
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d={d} /></svg>
    </a>
  );
}

function FooterBrand({ brandMain, brandAccent }: { brandMain: string; brandAccent: string }) {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-[var(--accent)] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <svg className="relative h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M18 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M12 12 3 3" />
          <path d="M12 12l9-9" />
          <path d="M12 12v10" />
          <path d="m15 19-3 3-3-3" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--text-primary)" }}>
        {brandMain} <span className="text-[var(--accent)]">{brandAccent}</span>
      </span>
    </>
  );
}

