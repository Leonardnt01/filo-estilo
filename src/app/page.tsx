"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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

const FALLBACK_SERVICE_SLIDES = [
  "https://montalvoformen.com.pe/wp-content/uploads/2023/04/portfolio-s12-1280x1280.jpeg",
  "https://montalvoformen.com.pe/wp-content/uploads/2023/04/portfolio-s62-1280x1280.jpeg",
  "https://kingschair.ca/wp-content/uploads/2025/07/hot-towel-shave-kings-chair-barbershop.jpg",
  "https://static.vecteezy.com/system/resources/thumbnails/071/785/389/small/focused-barber-s-hands-precisely-trimming-a-serious-bearded-man-s-stylish-haircut-photo.jpg",
  "https://raorbarberstudio.com/wp-content/uploads/2024/09/Corte-de-Cabello-Raor-Barber-Studio-Barbershop-Palma-de-Mallorca-1200x800.jpg",
];

const FALLBACK_SUCCESS_STORIES = [
  {
    name: "Luis M.",
    result: "Cambio de look completo",
    quote: "Pasé de un estilo clásico a uno moderno para mi nuevo trabajo. Me sentí otra persona.",
    image: "https://montalvoformen.com.pe/wp-content/uploads/2023/10/layer-1-260x260.png",
  },
  {
    name: "Diego R.",
    result: "Corte + barba premium",
    quote: "La precisión en la barba fue brutal. Me duró impecable toda la semana.",
    image: "https://montalvoformen.com.pe/wp-content/uploads/2023/10/layer-1-2-260x260.png",
  },
  {
    name: "Carlos T.",
    result: "Asesoría de imagen",
    quote: "No sabía qué corte hacerme y me recomendaron uno perfecto para mi rostro.",
    image: "https://montalvoformen.com.pe/wp-content/uploads/2023/10/layer-1-2-2-260x260.png",
  },
];

const FALLBACK_BRANCH_CONTACTS = [
  {
    id: "lince",
    name: "Sede Lince",
    address: "Av. Arequipa 2450, Lince, Lima",
    phone: "+51 999 999 999",
    whatsapp: "+51 999 999 999",
    mapsUrl: "https://maps.google.com/?q=Av.+Arequipa+2450,+Lince,+Lima",
    waUrl: "https://wa.me/51999999999",
  },
  {
    id: "san-isidro",
    name: "Sede San Isidro",
    address: "Av. Javier Prado Este 410, San Isidro, Lima",
    phone: "+51 988 777 666",
    whatsapp: "+51 988 777 666",
    mapsUrl: "https://maps.google.com/?q=Av.+Javier+Prado+Este+410,+San+Isidro,+Lima",
    waUrl: "https://wa.me/51988777666",
  },
] as const;

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeService, setActiveService] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [contactBranch, setContactBranch] = useState("");

  useEffect(() => {
    fetch("/api/public/home")
      .then((r) => r.json())
      .then((d) => {
        const nextBranches = d.branches ?? [];
        const nextServices = d.services ?? [];
        setBranches(nextBranches);
        setServices(nextServices);
        setFeaturedServices(d.featured_services ?? []);
        setTestimonials(d.testimonials ?? []);
        if (nextBranches.length > 0) {
          setContactBranch(nextBranches[0].slug);
        }
      })
      .catch(() => {
        setServices([]);
        setBranches([]);
        setFeaturedServices([]);
        setTestimonials([]);
      });
  }, []);

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
      .filter((url): url is string => Boolean(url));
    return dbSlides.length > 0 ? dbSlides : FALLBACK_SERVICE_SLIDES;
  }, [featuredServices]);

  useEffect(() => {
    if (keyServices.length <= 1) return;
    const timer = setInterval(() => {
      setActiveService((prev) => (prev + 1) % keyServices.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [keyServices.length]);

  const successStories = useMemo(() => {
    if (testimonials.length === 0) return FALLBACK_SUCCESS_STORIES;
    return testimonials.map((item) => ({
      name: item.name,
      result: item.result ?? item.title ?? "Experiencia premium",
      quote: item.quote,
      image: item.image_url ?? "https://montalvoformen.com.pe/wp-content/uploads/2023/10/layer-1-260x260.png",
    }));
  }, [testimonials]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % successStories.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [successStories.length]);

  return (
    <>
      <Navbar />

      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 70%, var(--bg-primary) 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-24 text-center">
          <span className="section-label">Barbería Premium</span>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Donde el estilo <span className="text-[var(--accent)]">define</span>
            <br />
            tu personalidad
          </h1>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto">
            Cortes profesionales, atención personalizada y experiencia de nivel en cada sede.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/reservar" className="btn-gold text-base !px-8 !py-3.5">Reservar Ahora</Link>
            <Link href="/#servicios" className="btn-outline text-base !px-8 !py-3.5 !text-white hover:!text-[var(--accent)]">Ver Servicios</Link>
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
              <img src="https://www.sanantonio.cl/media/k2/items/cache/bcba2c7d61a07f13286612c710db37fe_XL.jpg" alt="Barbero trabajando" className="h-88 md:h-[420px] w-full object-cover object-center rounded-2xl border border-[var(--border)]" />
              <img src="https://raorbarberstudio.com/wp-content/uploads/2024/04/Nuevo-Corte-Pelo-Mejora-Autoestima-Raor-Barber-Studio-Barbershop-Palma-de-Mallorca-1200x800.jpg" alt="Detalle de corte" className="h-88 md:h-[420px] w-full object-cover object-center rounded-2xl border border-[var(--border)]" />
            </div>
            <div>
              <span className="section-label">Quiénes Somos</span>
              <h2 className="mt-4 text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Redefiniendo el estándar del cuidado masculino
              </h2>
              <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
                En Filo Estilo fusionamos la maestría técnica con una visión moderna de la imagen. Nuestro compromiso es ofrecerte una experiencia premium donde la precisión artesanal y la asesoría personalizada se unen para potenciar tu identidad única.
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
            {[
              {
                title: "Humanidad",
                desc: "Atención cercana para que te sientas cómodo desde que llegas.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                title: "Diferenciación",
                desc: "Técnicas actuales y propuesta de estilo personalizada.",
                icon: (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                    <line x1="20" y1="4" x2="8.12" y2="15.88" />
                    <line x1="14.47" y1="14.48" x2="20" y2="20" />
                    <line x1="8.12" y1="8.12" x2="12" y2="12" />
                  </svg>
                ),
              },
              {
                title: "Transparencia",
                desc: "Precios claros y recomendaciones honestas.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 8c-1.657 0-3 1.343-3 3m6 0a3 3 0 00-3-3m0 0V5m0 6v8m6-2.5a9 9 0 11-12 0" />
                  </svg>
                ),
              },
              {
                title: "Empatía",
                desc: "Escuchamos lo que buscas y lo llevamos a un look real.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 10h8M8 14h5M6 3h12a2 2 0 012 2v12a2 2 0 01-2 2h-5l-4 3v-3H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <article key={item.title} className="glass-card group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-border)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  {item.icon}
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
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold">✓</span>
                  <span><strong>Asesoría de Visagismo:</strong> Diseñamos tu look basándonos en tu estructura facial y estilo personal.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold">✓</span>
                  <span><strong>Maestría Técnica:</strong> Especialistas capacitados en las tendencias más vanguardistas del mundo.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold">✓</span>
                  <span><strong>Productos Premium:</strong> Utilizamos marcas líderes para garantizar un acabado de nivel superior.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold">✓</span>
                  <span><strong>Gestión de Tiempo:</strong> Sistema de reserva online ágil y atención personalizada por WhatsApp.</span>
                </li>
              </ul>
            </div>
            <img src="https://cdn.pixabay.com/photo/2019/02/25/13/38/haircut-4019676_1280.jpg" alt="Barbero en acción" className="h-[420px] w-full object-cover rounded-2xl border border-[var(--border)]" />
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

          {keyServices.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">Cargando servicios...</p>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="grid lg:grid-cols-2">
                <img
                  src={serviceSlides[activeService % serviceSlides.length]}
                  alt={keyServices[activeService].name}
                  className="h-64 md:h-80 lg:h-[440px] w-full object-cover object-center"
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
                    <img
                      src={successStories[activeStory].image}
                      alt={successStories[activeStory].name}
                      className="h-36 w-36 md:h-44 md:w-44 rounded-full object-cover object-center"
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
                  Agenda, consulta o escríbenos
                </h3>
                <p className="mt-3 text-[var(--text-secondary)]">
                  Te ayudamos a elegir sede, servicio y horario ideal. Respuesta rápida por WhatsApp o llamada.
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
                      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">Central telefónica</p>
                      <span className="text-sm text-[var(--text-secondary)]">Atención Lun - Sáb 9:00 a.m. - 8:00 p.m.</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold text-sm sm:text-base whitespace-nowrap">{selectedBranch.phone}</span>
                  </a>
                  <a href={selectedBranch.waUrl} target="_blank" rel="noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 hover:border-[var(--accent-border)] transition-colors">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">WhatsApp</p>
                      <span className="text-sm text-[var(--text-secondary)]">Reservas y consultas inmediatas</span>
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
        href={selectedBranch?.waUrl ?? "https://wa.me/51999999999"}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-105 transition-transform"
      >
        <svg className="h-7 w-7" viewBox="0 0 32 32" fill="currentColor">
          <path d="M19.11 17.205c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.148-1.255-.463-2.39-1.475-.883-.788-1.48-1.762-1.653-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.148-.174.198-.298.297-.497.1-.198.05-.372-.024-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479s1.064 2.875 1.213 3.074c.148.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.695.625.711.227 1.36.195 1.87.118.572-.085 1.758-.718 2.006-1.412.248-.694.248-1.29.174-1.413-.075-.124-.273-.198-.57-.347z" />
          <path d="M16.001 3.2c-7.062 0-12.8 5.739-12.8 12.8 0 2.259.591 4.466 1.714 6.412L3.2 28.8l6.558-1.693A12.745 12.745 0 0016 28.8c7.061 0 12.8-5.739 12.8-12.8 0-7.061-5.739-12.8-12.8-12.8zm0 23.273a10.4 10.4 0 01-5.294-1.445l-.379-.226-3.89 1.004 1.038-3.793-.247-.389A10.398 10.398 0 015.6 16c0-5.734 4.666-10.4 10.4-10.4 5.733 0 10.4 4.666 10.4 10.4 0 5.733-4.667 10.4-10.4 10.4z" />
        </svg>
      </a>

      <Footer />
    </>
  );
}
