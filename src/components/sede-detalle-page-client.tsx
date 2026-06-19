"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Footer } from "@/components/footer";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  maps_url?: string | null;
  whatsapp?: string | null;
  hero_image_url?: string | null;
  cover_image_url?: string | null;
};

type FooterBranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; image_url?: string | null };
type Barber = { id: string; full_name: string; specialty: string | null; image_url?: string | null };

const SERVICE_FALLBACK_IMAGE = "/hero-bg.png";
const BARBER_FALLBACK_IMAGE = "/hero-bg.png";

function getServiceImageByName(serviceName: string) {
  const key = serviceName.toLowerCase();
  if (key.includes("barba")) return "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?q=80&w=900&auto=format&fit=crop";
  if (key.includes("corte")) return "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=900&auto=format&fit=crop";
  if (key.includes("premium")) return "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=900&auto=format&fit=crop";
  if (key.includes("afeitado")) return "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?q=80&w=900&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=900&auto=format&fit=crop";
}

function getBarberImageByName(fullName: string) {
  const name = fullName.toLowerCase();
  if (name.includes("carlos")) return "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=600&auto=format&fit=crop";
  if (name.includes("javier")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop";
  if (name.includes("jefferson")) return "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop";
  if (name.includes("miguel")) return "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";
}

export default function SedeDetallePageClient({
  branch,
  initialServices,
  initialBarbers,
  footerBranchContact,
}: {
  branch: Branch | null;
  initialServices: Service[];
  initialBarbers: Barber[];
  footerBranchContact?: FooterBranchContact | null;
}) {
  const services = initialServices;
  const barbers = initialBarbers;
  const loading = false;

  const googleMapsLink = useMemo(() => {
    if (!branch) return "#";
    if (branch.maps_url?.trim()) return branch.maps_url;
    const query = encodeURIComponent(branch.address || `${branch.name} Lima Perú`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [branch]);

  const whatsappLink = useMemo(() => {
    if (!branch) return "#";
    const digits = (branch.whatsapp || branch.phone || "51999999999").replace(/\D/g, "");
    const normalized = digits.startsWith("51") ? digits : `51${digits}`;
    const text = encodeURIComponent(`Hola, quiero reservar en ${branch.name}.`);
    return `https://wa.me/${normalized}?text=${text}`;
  }, [branch]);

  return (
    <>
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
                <Link
                  href="/sedes"
                  className="group inline-flex items-center gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] shadow-sm transition-all hover:brightness-110 hover:shadow-md"
                >
                  <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a Sedes
                </Link>
              </div>
              <div className="mb-10 glass-card overflow-hidden">
                <div className="relative h-64 w-full">
                  <Image
                    src={branch.hero_image_url || branch.cover_image_url || SERVICE_FALLBACK_IMAGE}
                    alt={branch.name}
                    fill
                    priority
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover"
                  />
                </div>
                <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                  <div>
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

                  <aside className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/20 p-3.5 md:ml-auto md:max-w-md md:p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">Conecta con la sede</p>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      Encuentra la ubicación exacta y síguenos para ver promociones, estilos y novedades.
                    </p>

                    <div className="mt-3 grid gap-2">
                      <a
                        href={googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm hover:border-[var(--accent-border)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          Ver en Google Maps
                        </span>
                        <span className="text-[var(--accent)]">↗</span>
                      </a>

                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/15"
                      >
                        <span className="inline-flex items-center gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 .007c-6.617 0-12 5.391-12 12 0 2.115.549 4.16 1.595 5.977l-1.595 5.83 5.951-1.564c1.752.959 3.737 1.464 5.753 1.464h.003c6.616 0 12-5.39 12-12 0-3.2-1.243-6.206-3.5-8.46-2.256-2.254-5.262-3.497-8.462-3.497z" />
                          </svg>
                          Reserva por WhatsApp
                        </span>
                        <span>↗</span>
                      </a>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href="https://www.instagram.com/explore/search/keyword/?q=barberia"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E1306C]/40 bg-[#E1306C]/12 px-3 py-1.5 text-xs text-[#F777B4] hover:bg-[#E1306C]/18"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.4 1.8h-8.3A4.35 4.35 0 0 0 3.8 7.85v8.3a4.35 4.35 0 0 0 4.05 4.05h8.3a4.35 4.35 0 0 0 4.05-4.05v-8.3a4.35 4.35 0 0 0-4.05-4.05ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.8 4.8 0 0 1 12 7.2Zm0 1.8A3 3 0 1 0 15 12a3 3 0 0 0-3-3Zm5.15-2.05a1.15 1.15 0 1 1-1.15 1.15 1.15 1.15 0 0 1 1.15-1.15Z" />
                        </svg>
                        Instagram
                      </a>
                      <a
                        href="https://www.facebook.com/search/top?q=barber%C3%ADa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#1877F2]/40 bg-[#1877F2]/12 px-3 py-1.5 text-xs text-[#74B0FF] hover:bg-[#1877F2]/18"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.5 21v-7h2.35l.4-2.8H13.5V9.45c0-.8.25-1.35 1.4-1.35h1.5V5.6c-.26-.03-1.14-.1-2.16-.1-2.14 0-3.61 1.3-3.61 3.69v2.01H8.2V14h2.43v7h2.87Z" />
                        </svg>
                        Facebook
                      </a>
                      <a
                        href="https://www.tiktok.com/search?q=barberia"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/40 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14.6 3c.2 1.8 1.2 3.2 2.9 4 .8.4 1.6.6 2.5.6v2.8c-1 0-2-.2-2.9-.6-.9-.4-1.7-.9-2.4-1.6v6.2c0 3-2.4 5.4-5.4 5.4S4 17.4 4 14.4 6.4 9 9.4 9c.5 0 1 .1 1.5.2v2.9a2.6 2.6 0 0 0-1.5-.5c-1.5 0-2.8 1.2-2.8 2.8s1.2 2.8 2.8 2.8 2.8-1.2 2.8-2.8V3h2.4Z" />
                        </svg>
                        TikTok
                      </a>
                    </div>
                  </aside>
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
                          <Image
                            src={s.image_url || getServiceImageByName(s.name) || SERVICE_FALLBACK_IMAGE}
                            alt={s.name}
                            fill
                            loading="eager"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-all duration-500 group-hover:scale-105"
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
                    const barberImage = b.image_url || getBarberImageByName(b.full_name) || BARBER_FALLBACK_IMAGE;
                    const specialty = b.specialty ?? "Barbero profesional";

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
                          <Image
                            src={barberImage}
                            alt={b.full_name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-all duration-500 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>

                          <div className="absolute top-3 left-3 h-8 w-8 rounded-full border border-[var(--accent-border)] bg-black/80 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                            {initials}
                          </div>

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
      <Footer initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}
