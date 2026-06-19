"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { SiGooglemaps, SiWhatsapp } from "react-icons/si";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  maps_url?: string | null;
  whatsapp?: string | null;
};

type FooterBranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export default function SedesPageClient({
  initialBranches,
  footerBranchContact,
}: {
  initialBranches: Branch[];
  footerBranchContact?: FooterBranchContact | null;
}) {
  const router = useRouter();
  const branches = initialBranches;
  const loading = false;

  return (
    <>
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="section-label">Sedes</span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Elige tu <span className="text-[var(--accent)]">Barbería</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">Selecciona una sede para ver servicios, equipo y reservar en segundos.</p>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="glass-card overflow-hidden">
                  <div className="h-44 w-full animate-pulse bg-[var(--bg-surface-hover)]" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="mt-4 flex items-center justify-between">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                      <div className="h-4 w-16 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">No hay sedes disponibles.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => (
                <article
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/sedes/${b.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/sedes/${b.slug}`);
                    }
                  }}
                  className="glass-card overflow-hidden group hover:border-[var(--accent-border)] transition-colors cursor-pointer"
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={
                      b.slug === "sede-principal"
                        ? "https://www.businessempresarial.com.pe/wp-content/uploads/2025/09/Montalvo-For-Men-780x470.jpeg"
                        : b.slug === "sede-norte"
                        ? "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop"
                        : "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"
                      }
                      alt={b.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold">{b.name}</h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{b.address ?? "Dirección por confirmar"}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{b.phone ?? "Teléfono por confirmar"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href={
                          b.maps_url?.trim()
                            ? b.maps_url
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address || `${b.name} Lima Perú`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#4285F4]/35 bg-[#4285F4]/12 px-2.5 py-1 text-[11px] text-[#A7C7FF] transition-all hover:bg-[#4285F4]/20 hover:brightness-110"
                      >
                        <SiGooglemaps className="h-3.5 w-3.5 text-[#4285F4]" />
                        Maps
                      </a>
                      <a
                        href={`https://wa.me/${(b.whatsapp || b.phone || "51999999999").replace(/\D/g, "").startsWith("51") ? (b.whatsapp || b.phone || "51999999999").replace(/\D/g, "") : `51${(b.whatsapp || b.phone || "999999999").replace(/\D/g, "")}`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/35 bg-[#25D366]/12 px-2.5 py-1 text-[11px] text-[#6EF2A6] transition-all hover:bg-[#25D366]/20 hover:brightness-110"
                      >
                        <SiWhatsapp className="h-3.5 w-3.5 text-[#25D366]" />
                        WhatsApp
                      </a>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-[var(--text-muted)]">Servicios y equipo disponibles</span>
                      <p className="text-sm font-semibold text-[var(--accent)]">Ver sede →</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}
