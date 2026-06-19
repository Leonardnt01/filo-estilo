"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiWhatsapp } from "react-icons/si";

import { Footer } from "@/components/footer";
import {
  DEFAULT_HOME_SETTINGS,
  FALLBACK_BRANCH_CONTACTS,
  isSafeImageUrl,
  type HomePageData,
} from "@/components/home-page-shared";

export default function HomePageInteractive({
  initialData,
}: {
  initialData: HomePageData;
}) {
  const branches = initialData.branches ?? [];
  const services = initialData.services ?? [];
  const featuredServices = initialData.featured_services ?? [];
  const testimonials = initialData.testimonials ?? [];
  const homeSettings = initialData.site_settings?.public_home ?? {};
  const footerSettings = initialData.site_settings?.public_footer ?? {};

  const [activeService, setActiveService] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [mobileServiceIndex, setMobileServiceIndex] = useState(0);
  const [contactBranch, setContactBranch] = useState(branches[0]?.slug ?? "");

  const logImageError = (context: string, src: string | undefined, extra?: Record<string, unknown>) => {
    console.error("[HomeImageError]", {
      context,
      src: src ?? null,
      ...extra,
    });
  };

  const keyServices = useMemo(() => {
    const seen = new Set<string>();
    return services
      .filter((s) => {
        const key = s.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [services]);

  const serviceSlides = useMemo(() => {
    const dbSlides = featuredServices
      .map((item) => item.image_url)
      .filter((url): url is string => isSafeImageUrl(url));
    const configuredSlides = Array.isArray(homeSettings.service_slide_images)
      ? homeSettings.service_slide_images.filter((url): url is string => isSafeImageUrl(url))
      : [];
    return dbSlides.length > 0 ? dbSlides : (configuredSlides.length > 0 ? configuredSlides : DEFAULT_HOME_SETTINGS.service_slide_images);
  }, [featuredServices, homeSettings.service_slide_images]);

  useEffect(() => {
    if (keyServices.length <= 1) return;
    const timer = setInterval(() => {
      setActiveService((prev) => (prev + 1) % keyServices.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [keyServices.length]);

  useEffect(() => {
    const mobileItems = services.slice(0, 8);
    if (mobileItems.length <= 1) return;
    const timer = setInterval(() => {
      setMobileServiceIndex((prev) => (prev + 1) % mobileItems.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [services]);

  const successStories = useMemo(() => {
    const configuredFallback = Array.isArray(homeSettings.fallback_testimonials)
      ? homeSettings.fallback_testimonials
      : DEFAULT_HOME_SETTINGS.fallback_testimonials;
    if (testimonials.length === 0) return configuredFallback;
    return testimonials.map((item) => ({
      name: item.name,
      result: item.result ?? item.title ?? "Experiencia premium",
      quote: item.quote,
      image: item.image_url ?? configuredFallback[0]?.image ?? "/hero-bg.png",
    }));
  }, [testimonials, homeSettings.fallback_testimonials]);

  const branchContacts = useMemo(() => {
    if (branches.length === 0) return FALLBACK_BRANCH_CONTACTS;
    const mapped = branches.map((b) => {
      const numericPhone = (b.phone ?? "").replace(/\D/g, "");
      const waNumeric = (b.whatsapp ?? "").replace(/\D/g, "");
      return {
        id: b.slug,
        name: b.name,
        address: b.address ?? "Direccion por actualizar",
        phone: b.phone ?? "+51 999 999 999",
        whatsapp: b.whatsapp ?? b.phone ?? "+51 999 999 999",
        mapsUrl: b.maps_url ?? "https://maps.google.com",
        waUrl: `https://wa.me/${waNumeric || numericPhone || "51999999999"}`,
      };
    });
    return mapped.length > 0 ? mapped : FALLBACK_BRANCH_CONTACTS;
  }, [branches]);

  const selectedBranch = branchContacts.find((b) => b.id === contactBranch) ?? branchContacts[0];
  const content = { ...DEFAULT_HOME_SETTINGS, ...homeSettings };
  const floatingWa = (content.floating_whatsapp || "").replace(/\D/g, "") || "51999999999";

  return (
    <>
      <section id="servicios" className="py-24 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Servicios Clave</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Nuestros <span className="text-[var(--accent)]">Favoritos</span>
            </h2>
          </div>

          {keyServices.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">No hay servicios disponibles.</p>
          ) : (
            <div className="space-y-8">
              <div className="glass-card overflow-hidden">
                <div className="grid lg:grid-cols-2">
                  <Image
                    src={serviceSlides[activeService % serviceSlides.length]}
                    alt={keyServices[activeService].name}
                    width={1200}
                    height={880}
                    priority={activeService === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="h-64 w-full object-cover object-center md:h-80 lg:h-[440px]"
                    onError={(e) =>
                      logImageError("featured-hero", e.currentTarget.src, {
                        activeService,
                        serviceName: keyServices[activeService]?.name,
                      })
                    }
                  />
                  <div className="p-8 lg:p-10 flex flex-col justify-center">
                    <p className="text-sm uppercase tracking-wider text-[var(--accent)] font-semibold">Servicio destacado</p>
                    <h3 className="mt-2 text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>{keyServices[activeService].name}</h3>
                    <p className="mt-3 text-[var(--text-secondary)]">{keyServices[activeService].description ?? "Servicio profesional con acabado premium."}</p>
                    <p className="mt-4 text-lg font-semibold text-[var(--accent)]">
                      S/ {keyServices[activeService].price} · {keyServices[activeService].duration_minutes} min
                    </p>
                    <div className="mt-6">
                      <Link href="/reservar" className="btn-gold">Reservar este servicio</Link>
                    </div>
                    <div className="mt-6 flex gap-2">
                      {keyServices.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveService(idx)}
                          className={`h-2.5 rounded-full transition-all ${activeService === idx ? "w-8 bg-[var(--accent)]" : "w-2.5 bg-[var(--border-strong)]"}`}
                          aria-label={`Ver servicio ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:hidden">
                <div className="relative overflow-hidden rounded-2xl">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${mobileServiceIndex * 100}%)` }}
                  >
                    {services.slice(0, 8).map((service, idx) => (
                      <article
                        key={service.id}
                        className="group relative w-full shrink-0 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] min-h-[280px]"
                      >
                        <Image
                          src={serviceSlides[idx % serviceSlides.length]}
                          alt={service.name}
                          fill
                          sizes="100vw"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) =>
                            logImageError("mobile-service-card", e.currentTarget.src, {
                              idx,
                              serviceId: service.id,
                              serviceName: service.name,
                            })
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                        <div className="relative z-10 flex h-full flex-col justify-end p-4">
                          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Servicio</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">{service.name}</h3>
                          <p className="mt-1 text-xs text-white/80 line-clamp-2">{service.description ?? "Cuidado profesional para tu estilo."}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-base font-bold text-[var(--accent)]">S/ {service.price}</span>
                            <span className="text-xs text-white/90">{service.duration_minutes} min</span>
                          </div>
                          <Link
                            href={`/reservar?service_id=${service.id}`}
                            className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--bg-primary)]"
                          >
                            Reservar
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileServiceIndex((prev) => (prev - 1 + services.slice(0, 8).length) % services.slice(0, 8).length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm"
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileServiceIndex((prev) => (prev + 1) % services.slice(0, 8).length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm"
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                </div>
                <div className="mt-3 flex justify-center gap-1.5">
                  {services.slice(0, 8).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMobileServiceIndex(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${mobileServiceIndex === idx ? "w-6 bg-[var(--accent)]" : "w-2 bg-[var(--border-strong)]"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="hidden sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {services.slice(0, 8).map((service, idx) => (
                  <article
                    key={service.id}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] min-h-[260px]"
                  >
                    <Image
                      src={serviceSlides[idx % serviceSlides.length]}
                      alt={service.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) =>
                        logImageError("desktop-service-card", e.currentTarget.src, {
                          idx,
                          serviceId: service.id,
                          serviceName: service.name,
                        })
                      }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                    <div className="relative z-10 flex h-full flex-col justify-end p-4">
                      <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Servicio</p>
                      <h3 className="mt-1 text-base font-semibold text-white">{service.name}</h3>
                      <p className="mt-1 text-xs text-white/75 line-clamp-2">{service.description ?? "Cuidado profesional para tu estilo."}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-[var(--accent)]">S/ {service.price}</span>
                        <span className="translate-y-3 opacity-0 text-xs text-white transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          {service.duration_minutes} min
                        </span>
                      </div>
                      <Link
                        href={`/reservar?service_id=${service.id}`}
                        className="mt-3 inline-flex w-fit translate-y-3 items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-primary)] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                      >
                        Reservar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="casos" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Resultados</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Casos de <span className="text-[var(--accent)]">Éxito</span>
            </h2>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="relative h-56 md:h-64 lg:h-[320px] w-full overflow-hidden bg-[var(--bg-secondary)]">
                <div className="relative z-10 flex h-full items-center justify-center p-6">
                  <div className="rounded-full border-2 border-[var(--accent-border)] p-2 shadow-2xl">
                    <Image
                      src={successStories[activeStory].image}
                      alt={successStories[activeStory].name}
                      width={176}
                      height={176}
                      sizes="176px"
                      className="h-36 w-36 rounded-full object-cover object-center md:h-44 md:w-44"
                      onError={(e) =>
                        logImageError("testimonial-avatar", e.currentTarget.src, {
                          activeStory,
                          name: successStories[activeStory]?.name,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="p-8 lg:p-10 flex flex-col justify-center">
                <p className="text-sm uppercase tracking-wider text-[var(--accent)] font-semibold">{successStories[activeStory].result}</p>
                <blockquote className="mt-4 text-xl leading-relaxed" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  “{successStories[activeStory].quote}”
                </blockquote>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">- {successStories[activeStory].name}</p>
                <div className="mt-8 flex gap-2">
                  {successStories.map((_, idx) => (
                    <button key={idx} onClick={() => setActiveStory(idx)} className={`h-2.5 rounded-full transition-all ${activeStory === idx ? "w-8 bg-[var(--accent)]" : "w-2.5 bg-[var(--border-strong)]"}`} aria-label={`Ver caso ${idx + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="py-20 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="glass-card p-8 md:p-12 overflow-hidden relative">
            <div
              className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-25"
              style={{ background: "radial-gradient(circle, rgba(212,168,67,0.55) 0%, transparent 70%)" }}
            />
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start relative z-10">
              <div>
                <span className="section-label">Contacto</span>
                <h3 className="mt-4 text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  {content.contact_title}
                </h3>
                <p className="mt-3 text-[var(--text-secondary)]">
                  {content.contact_subtitle}
                </p>

                <div className="mt-6 grid gap-3">
                  <a href={selectedBranch.mapsUrl} target="_blank" rel="noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 hover:border-[var(--accent-border)] transition-colors">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">Dirección principal</p>
                      <span className="text-sm text-[var(--text-secondary)]">{selectedBranch.address}</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold text-sm sm:text-base">Ver mapa</span>
                  </a>
                  <a href={`tel:${selectedBranch.phone.replace(/\s+/g, "")}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 hover:border-[var(--accent-border)] transition-colors">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">{content.central_phone_label}</p>
                      <span className="text-sm text-[var(--text-secondary)]">{content.central_phone_schedule}</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold text-sm sm:text-base whitespace-nowrap">{selectedBranch.phone}</span>
                  </a>
                  <a href={selectedBranch.waUrl} target="_blank" rel="noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 hover:border-[var(--accent-border)] transition-colors">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">{content.whatsapp_label}</p>
                      <span className="text-sm text-[var(--text-secondary)]">{content.whatsapp_help_text}</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold text-sm sm:text-base whitespace-nowrap">{selectedBranch.whatsapp}</span>
                  </a>
                </div>
              </div>

              <form className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 md:p-6 space-y-4">
                <h4 className="text-lg font-semibold">Envíanos tu consulta</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="input-dark"
                  />
                  <input
                    type="tel"
                    placeholder="Celular"
                    className="input-dark"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  className="input-dark"
                />
                <select
                  className="input-dark"
                  value={contactBranch}
                  onChange={(e) => setContactBranch(e.target.value)}
                >
                  {branchContacts.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Cuéntanos qué servicio buscas o en qué horario te gustaría reservar"
                  className="input-dark min-h-[120px] resize-none"
                />
                <button type="button" className="btn-gold w-full justify-center">
                  Enviar consulta
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                  También puedes reservar al instante por WhatsApp si prefieres respuesta inmediata.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <a
        href={selectedBranch?.waUrl ?? `https://wa.me/${floatingWa}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-[#25D366] px-3 py-2 text-white shadow-[0_14px_40px_rgba(37,211,102,0.45)] transition-all duration-300 hover:scale-105 hover:brightness-105"
      >
        <span className="absolute -inset-1 -z-10 rounded-full bg-[#25D366]/30 blur-lg opacity-70 transition-opacity group-hover:opacity-100" />
        <SiWhatsapp className="h-7 w-7 shrink-0 text-white" />
        <span className="hidden pr-1 text-sm font-semibold sm:inline">WhatsApp</span>
      </a>

      <Footer
        initialSettings={footerSettings}
        initialBranchContact={branches[0] ?? null}
      />
    </>
  );
}
