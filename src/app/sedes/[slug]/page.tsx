"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  hero_image_url?: string | null;
  cover_image_url?: string | null;
};

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; image_url?: string | null };
type Barber = { id: string; full_name: string; specialty: string | null; image_url?: string | null };

const SERVICE_FALLBACK_IMAGE = "/hero-bg.png";
const BARBER_FALLBACK_IMAGE = "/hero-bg.png";

export default function SedeDetallePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const branch = useMemo(() => branches.find((b) => b.slug === slug) ?? null, [branches, slug]);

  useEffect(() => {
    async function load() {
      try {
        const cat = await fetch("/api/booking/catalog").then((r) => r.json());
        const list: Branch[] = cat.branches ?? [];
        setBranches(list);

        const found = list.find((b) => b.slug === slug);
        if (!found) return;

        const byBranch = await fetch(`/api/booking/catalog?branch_id=${found.id}`).then((r) => r.json());
        setServices(byBranch.services ?? []);
        setBarbers(byBranch.barbers ?? []);
      } catch {}
      setLoading(false);
    }
    void load();
  }, [slug]);

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          {loading ? (
            <>
              <div className="mb-10 glass-card overflow-hidden">
                <div className="h-56 w-full animate-pulse bg-[var(--bg-surface-hover)]" />
                <div className="p-6 md:p-8 space-y-3">
                  <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                  <div className="h-10 w-48 animate-pulse rounded-full bg-[var(--bg-surface-hover)] mt-4" />
                </div>
              </div>

              <section className="mb-10">
                <div className="h-7 w-40 animate-pulse rounded bg-[var(--bg-surface-hover)] mb-4" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="glass-card p-5 space-y-3">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                      <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="h-7 w-40 animate-pulse rounded bg-[var(--bg-surface-hover)] mb-4" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="glass-card p-5 space-y-3">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : !branch ? (
            <div className="glass-card p-8 text-center">
              <h1 className="text-2xl font-bold">Sede no encontrada</h1>
              <Link href="/sedes" className="mt-4 inline-block text-[var(--accent)] font-semibold">Volver a sedes</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <Link href="/sedes" className="group inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
                  <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a Sedes
                </Link>
              </div>
              <div className="mb-10 glass-card overflow-hidden">
                <img
                  src={branch.hero_image_url || branch.cover_image_url || SERVICE_FALLBACK_IMAGE}
                  alt={branch.name}
                  className="h-64 w-full object-cover"
                />
                <div className="p-6 md:p-8">
                <span className="section-label">Sede</span>
                <h1 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  {branch.name}
                </h1>
                <p className="mt-2 text-[var(--text-secondary)]">{branch.address ?? "Dirección por confirmar"}</p>
                <p className="text-[var(--text-secondary)]">{branch.phone ?? "Teléfono por confirmar"}</p>
                <Link href={`/reservar?branch_id=${branch.id}`} className="btn-gold mt-6 inline-flex">
                  Reservar en esta sede
                </Link>
                </div>
              </div>

              <section className="mb-14">
                <h2 className="text-2xl font-bold mb-6 font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Nuestros Servicios
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((s) => (
                    <div key={s.id} className="glass-card overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:border-[var(--accent-border)] hover:-translate-y-1">
                      <div>
                        <div className="h-44 w-full overflow-hidden relative">
                          <img 
                            src={s.image_url || SERVICE_FALLBACK_IMAGE}
                            alt={s.name} 
                            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <span className="absolute bottom-3 right-3 text-xs bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] px-2.5 py-1 rounded-full font-bold">
                            {s.duration_minutes} min
                          </span>
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{s.name}</h3>
                            <p className="text-[var(--accent)] font-black text-lg shrink-0">S/ {s.price}</p>
                          </div>
                          {s.description && (
                            <p className="mt-2.5 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-1">
                        <Link href={`/reservar?branch_id=${branch.id}&service_id=${s.id}`} className="btn-outline w-full text-center text-xs py-2 block font-semibold hover:bg-[var(--accent)] hover:text-black">
                          Reservar Servicio
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-6 font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Especialistas y Maestros Barberos
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {barbers.map((b) => {
                    const initials = b.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                    const barberImage = b.image_url || BARBER_FALLBACK_IMAGE;
                      const specialty = b.specialty ?? "Barbero profesional";
                    
                    // Map their specialty to a cool description of the cut they make
                    let cutDescription = "Estilos personalizados con precisión geométrica.";
                    if (specialty.toLowerCase().includes("fade") || specialty.toLowerCase().includes("clásico")) {
                      cutDescription = "Especialista en degradados modernos (Fade) y cortes ejecutivos clásicos.";
                    } else if (specialty.toLowerCase().includes("afeitado") || specialty.toLowerCase().includes("tradicional")) {
                      cutDescription = "Maestro del afeitado clásico con navaja libre y toallas calientes.";
                    } else if (specialty.toLowerCase().includes("barba")) {
                      cutDescription = "Experto en esculpido de barba, perfilado y rituales de hidratación facial.";
                    }

                    return (
                      <div key={b.id} className="glass-card overflow-hidden group transition-all duration-300 hover:border-[var(--accent-border)] hover:-translate-y-1 flex flex-col">
                        <div className="h-60 w-full overflow-hidden relative">
                          <img 
                            src={barberImage} 
                            alt={b.full_name} 
                            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 filter grayscale group-hover:grayscale-0" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                          
                          {/* Top-left Initials Badge */}
                          <div className="absolute top-3 left-3 h-8 w-8 rounded-full border border-[var(--accent-border)] bg-black/80 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                            {initials}
                          </div>
                          
                          {/* Bottom specialty overlay */}
                          <div className="absolute bottom-3 left-3 right-3 text-left">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--accent)] font-bold bg-[var(--accent-soft)] px-2 py-0.5 rounded border border-[var(--accent-border)]">
                              {specialty}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                              {b.full_name}
                            </h3>
                            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                              {cutDescription}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-medium">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Disponible
                            </span>
                            <span>Corte: {specialty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
