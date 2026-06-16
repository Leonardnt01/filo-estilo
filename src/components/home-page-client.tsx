"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { SiWhatsapp } from "react-icons/si";

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number };
type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  maps_url: string | null;
  is_featured?: boolean;
};
type FeaturedService = { id: string; branch_id: string | null; service_id: string | null; title: string; image_url: string | null; sort_order: number };
type Testimonial = { id: string; branch_id: string | null; name: string; title: string | null; result: string | null; quote: string; image_url: string | null; sort_order: number };
type HomeStory = { name: string; result: string; quote: string; image: string };
type HomeValueCard = { title: string; desc: string };
type HomeExperiencePoint = { title: string; text: string };
type PublicHomeSettings = {
  hero_badge?: string;
  hero_title_line_1?: string;
  hero_title_highlight?: string;
  hero_title_line_2?: string;
  hero_subtitle?: string;
  who_we_are_text?: string;
  contact_title?: string;
  contact_subtitle?: string;
  central_phone_label?: string;
  central_phone_schedule?: string;
  whatsapp_label?: string;
  whatsapp_help_text?: string;
  floating_whatsapp?: string;
  who_image_1?: string;
  who_image_2?: string;
  experience_image?: string;
  service_slide_images?: string[];
  fallback_testimonials?: HomeStory[];
  value_cards?: HomeValueCard[];
  experience_points?: HomeExperiencePoint[];
};
type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};
type HomePageData = {
  branches?: Branch[];
  services?: Service[];
  featured_services?: FeaturedService[];
  testimonials?: Testimonial[];
  site_settings?: {
    public_footer?: FooterSettings;
    public_home?: PublicHomeSettings;
  };
};

const BLOCKED_IMAGE_HOSTS = ["vecteezy.com"];

function isSafeImageUrl(url: string | null | undefined) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return !BLOCKED_IMAGE_HOSTS.some((host) => parsed.hostname.includes(host));
  } catch {
    return false;
  }
}

const FALLBACK_BRANCH_CONTACTS = [
  {
    id: "principal",
    name: "Sede Principal",
    address: "Dirección por actualizar",
    phone: "+51 000 000 000",
    whatsapp: "+51 000 000 000",
    mapsUrl: "https://maps.google.com",
    waUrl: "https://wa.me/51999999999",
  },
] as const;

const DEFAULT_HOME_SETTINGS: Required<PublicHomeSettings> = {
  hero_badge: "Barbería Premium",
  hero_title_line_1: "Donde el estilo",
  hero_title_highlight: "define",
  hero_title_line_2: "tu personalidad",
  hero_subtitle: "Cortes profesionales, atención personalizada y experiencia de nivel en cada sede.",
  who_we_are_text:
    "En Filo Estilo fusionamos la maestría técnica con una visión moderna de la imagen. Nuestro compromiso es ofrecerte una experiencia premium donde la precisión artesanal y la asesoría personalizada se unen para potenciar tu identidad única.",
  contact_title: "Agenda, consulta o escríbenos",
  contact_subtitle: "Te ayudamos a elegir sede, servicio y horario ideal. Respuesta rápida por WhatsApp o llamada.",
  central_phone_label: "Central telefónica",
  central_phone_schedule: "Atención Lun - Sáb 9:00 a.m. - 8:00 p.m.",
  whatsapp_label: "WhatsApp",
  whatsapp_help_text: "Reservas y consultas inmediatas",
  floating_whatsapp: "+51 999 999 999",
  who_image_1: "/hero-bg.png",
  who_image_2: "/hero-bg.png",
  experience_image: "/hero-bg.png",
  service_slide_images: ["/hero-bg.png"],
  fallback_testimonials: [
    {
      name: "Cliente",
      result: "Resultado premium",
      quote: "Excelente experiencia, muy recomendado.",
      image: "/hero-bg.png",
    },
  ],
  value_cards: [
    { title: "Humanidad", desc: "Atención cercana para que te sientas cómodo desde que llegas." },
    { title: "Diferenciación", desc: "Técnicas actuales y propuesta de estilo personalizada." },
    { title: "Transparencia", desc: "Precios claros y recomendaciones honestas." },
    { title: "Empatía", desc: "Escuchamos lo que buscas y lo llevamos a un look real." },
  ],
  experience_points: [
    { title: "Asesoría de Visagismo", text: "Diseñamos tu look basándonos en tu estructura facial y estilo personal." },
    { title: "Maestría Técnica", text: "Especialistas capacitados en las tendencias más vanguardistas del mundo." },
    { title: "Productos Premium", text: "Utilizamos marcas líderes para garantizar un acabado de nivel superior." },
    { title: "Gestión de Tiempo", text: "Sistema de reserva online ágil y atención personalizada por WhatsApp." },
  ],
};

export default function HomePageClient({ initialData }: { initialData: HomePageData }) {
  const initialBranches = initialData.branches ?? [];
  const initialServices = initialData.services ?? [];
  const initialFeaturedServices = initialData.featured_services ?? [];
  const initialTestimonials = initialData.testimonials ?? [];
  const initialHomeSettings = initialData.site_settings?.public_home ?? {};
  const initialFooterSettings = initialData.site_settings?.public_footer ?? {};

  const [services] = useState<Service[]>(initialServices);
  const [loadingHome] = useState(false);
  const [branches] = useState<Branch[]>(initialBranches);
  const [featuredServices] = useState<FeaturedService[]>(initialFeaturedServices);
  const [testimonials] = useState<Testimonial[]>(initialTestimonials);
  const [activeService, setActiveService] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [mobileServiceIndex, setMobileServiceIndex] = useState(0);
  const [contactBranch, setContactBranch] = useState(initialBranches[0]?.slug ?? "");
  const [homeSettings] = useState<PublicHomeSettings>(initialHomeSettings);

  const logImageError = (context: string, src: string | undefined, extra?: Record<string, unknown>) => {
    // Debug helper to identify broken external image URLs quickly.
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
    console.log("[HomeData] serviceSlides", serviceSlides);
    const suspicious = serviceSlides.filter((url) => typeof url === "string" && url.includes("vecteezy.com"));
    if (suspicious.length > 0) {
      console.warn("[HomeData] suspicious slide urls found", suspicious);
    }
  }, [serviceSlides]);

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
        address: b.address ?? "Dirección por actualizar",
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
  const valueCards =
    Array.isArray(content.value_cards) && content.value_cards.length > 0
      ? content.value_cards
      : DEFAULT_HOME_SETTINGS.value_cards;
  const experiencePoints =
    Array.isArray(content.experience_points) && content.experience_points.length > 0
      ? content.experience_points
      : DEFAULT_HOME_SETTINGS.experience_points;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % successStories.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [successStories.length]);

  return (
    <>
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 70%, var(--bg-primary) 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-24 text-center">
          <span className="section-label">{content.hero_badge}</span>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>
            {content.hero_title_line_1} <span className="text-[var(--accent)]">{content.hero_title_highlight}</span>
            <br />
            {content.hero_title_line_2}
          </h1>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto">
            {content.hero_subtitle}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/reservar" className="btn-gold text-base !px-8 !py-3.5">Reservar Ahora</Link>
            <Link href="/servicios" className="btn-outline text-base !px-8 !py-3.5 !text-white hover:!text-[var(--accent)]">Ver Servicios</Link>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 animate-bounce">
          <Link href="/#quienes" className="group flex items-center justify-center h-14 w-14 rounded-full border-2 border-[var(--accent)] bg-[#0b0b10] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all hover:scale-110 shadow-2xl">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M19 14l-7 7-7-7" />
            </svg>
          </Link>
        </div>
      </section>

      <section id="quienes" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="grid grid-cols-2 gap-4">
              <Image
                src={content.who_image_1}
                alt="Barbero trabajando"
                width={840}
                height={840}
                sizes="(max-width: 1024px) 50vw, 420px"
                className="h-88 w-full rounded-2xl border border-[var(--border)] object-cover object-center md:h-[420px]"
              />
              <Image
                src={content.who_image_2}
                alt="Detalle de corte"
                width={840}
                height={840}
                sizes="(max-width: 1024px) 50vw, 420px"
                className="h-88 w-full rounded-2xl border border-[var(--border)] object-cover object-center md:h-[420px]"
              />
            </div>
            <div>
              <span className="section-label">Quiénes Somos</span>
              <h2 className="mt-4 text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Redefiniendo el estándar del cuidado masculino
              </h2>
              <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
                {content.who_we_are_text}
              </p>
              <Link href="/sedes" className="btn-outline mt-6">Explorar Nuestras Sedes</Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-24 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(1200px 400px at 50% -10%, rgba(212,168,67,0.12), transparent 60%), var(--bg-secondary)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <span className="section-label">Virtudes</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Lo que nos diferencia
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] max-w-2xl mx-auto">
              Un estándar de servicio pensado para que tu experiencia se sienta premium en cada visita.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueCards.map((item, idx) => (
              <article key={item.title} className="glass-card group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-border)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  {idx % 4 === 0 && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {idx % 4 === 1 && (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                      <line x1="20" y1="4" x2="8.12" y2="15.88" />
                      <line x1="14.47" y1="14.48" x2="20" y2="20" />
                      <line x1="8.12" y1="8.12" x2="12" y2="12" />
                    </svg>
                  )}
                  {idx % 4 === 2 && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 8c-1.657 0-3 1.343-3 3m6 0a3 3 0 00-3-3m0 0V5m0 6v8m6-2.5a9 9 0 11-12 0" />
                    </svg>
                  )}
                  {idx % 4 === 3 && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M8 10h8M8 14h5M6 3h12a2 2 0 012 2v12a2 2 0 01-2 2h-5l-4 3v-3H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                  )}
                </div>
                <h3 className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
                <div className="mt-4 h-px w-16 bg-gradient-to-r from-[var(--accent)] to-transparent opacity-60" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-label">Experiencia Filo Estilo</span>
              <h2 className="mt-4 text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Compromiso con la perfección en cada detalle
              </h2>
              <ul className="mt-6 space-y-5 text-[var(--text-secondary)]">
                {experiencePoints.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <span className="text-[var(--accent)] font-bold">✓</span>
                    <span><strong>{point.title}:</strong> {point.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Image
              src={content.experience_image}
              alt="Barbero en acción"
              width={960}
              height={840}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-[420px] w-full rounded-2xl border border-[var(--border)] object-cover"
            />
          </div>
        </div>
      </section>

      <section id="servicios" className="py-24 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Servicios Clave</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Nuestros <span className="text-[var(--accent)]">Favoritos</span>
            </h2>
          </div>

          {loadingHome ? (
            <div className="space-y-8 animate-pulse">
              <div className="glass-card overflow-hidden">
                <div className="grid lg:grid-cols-2">
                  <div className="h-64 md:h-80 lg:h-[440px] w-full bg-[var(--bg-surface)]" />
                  <div className="p-8 lg:p-10 space-y-4">
                    <div className="h-4 w-40 rounded bg-[var(--bg-surface)]" />
                    <div className="h-10 w-72 rounded bg-[var(--bg-surface)]" />
                    <div className="h-4 w-full rounded bg-[var(--bg-surface)]" />
                    <div className="h-4 w-2/3 rounded bg-[var(--bg-surface)]" />
                    <div className="h-11 w-52 rounded-full bg-[var(--bg-surface)]" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="h-[260px] rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]" />
                ))}
              </div>
            </div>
          ) : keyServices.length === 0 ? (
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
                        <img
                          src={serviceSlides[idx % serviceSlides.length]}
                          alt={service.name}
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
                    <img
                      src={serviceSlides[idx % serviceSlides.length]}
                      alt={service.name}
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
        initialSettings={initialFooterSettings}
        initialBranchContact={initialBranches[0] ?? null}
      />
    </>
  );
}

