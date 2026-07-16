"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Footer } from "@/components/footer";
import { SERVICE_FALLBACK_IMAGE, resolveBarberImage, resolveServiceImage } from "@/lib/catalog-images";

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

export default function SedeDetallePageClient({
  branch,
  initialServices,
  initialBarbers,
  footerBranchContact,
}: {
  branch: Branch;
  initialServices: Service[];
  initialBarbers: Barber[];
  footerBranchContact?: FooterBranchContact | null;
}) {
  const services = initialServices;
  const barbers = initialBarbers;

  const googleMapsLink = useMemo(() => {
    if (branch.maps_url?.trim()) return branch.maps_url;
    const query = encodeURIComponent(branch.address || `${branch.name} Lima Perú`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [branch]);

  const whatsappLink = useMemo(() => {
    const digits = (branch.whatsapp || branch.phone || "51999999999").replace(/\D/g, "");
    const normalized = digits.startsWith("51") ? digits : `51${digits}`;
    const text = encodeURIComponent(`Hola, quiero reservar en ${branch.name}.`);
    return `https://wa.me/${normalized}?text=${text}`;
  }, [branch]);

  return (
    <>
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-6">
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
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">Canales de atención</p>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      Encuentra la ubicación exacta y contáctanos directamente para confirmar horarios, consultas o reservas.
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
                            src={resolveServiceImage(s.name, s.image_url)}
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
                    const barberImage = resolveBarberImage(b.full_name, b.image_url);
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
        </div>
      </main>
      <Footer initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}
