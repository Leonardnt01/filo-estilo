"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

/* ── Types ── */
type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number };
type Barber = { id: string; full_name: string; specialty: string | null };

/* ── SVG icon helpers ── */
function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

/* ═══════════════ PAGE ═══════════════ */
export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeStory, setActiveStory] = useState(0);

  const successStories = [
    {
      name: "Luis M.",
      result: "Cambio de look completo",
      quote: "Pasé de un estilo clásico a uno moderno para mi nuevo trabajo. Me sentí otra persona.",
      image:
        "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Diego R.",
      result: "Corte + barba premium",
      quote: "La precisión en la barba fue brutal. Me duró impecable toda la semana.",
      image:
        "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "Carlos T.",
      result: "Asesoría de imagen",
      quote: "No sabía qué corte hacerme y me recomendaron uno perfecto para mi rostro.",
      image:
        "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  useEffect(() => {
    fetch("/api/booking/catalog")
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services ?? []);
        setBarbers(d.barbers ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % successStories.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [successStories.length]);

  return (
    <>
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Background image + overlay */}
        <div className="absolute inset-0">
          {/* Photo */}
          <img src="/hero-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/70" />
          {/* Gradient fade at edges */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, var(--bg-primary) 100%)" }} />
          {/* Radial gold glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
          {/* Decorative barber poles */}
          <div className="barber-pole absolute left-[8%] top-0 bottom-0 hidden lg:block rounded-full opacity-20" />
          <div className="barber-pole absolute right-[8%] top-0 bottom-0 hidden lg:block rounded-full opacity-20" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="animate-fade-in-up">
            <span className="section-label">
              <ScissorsIcon className="h-3.5 w-3.5" />
              Barbería Premium
            </span>
          </div>

          {/* Title */}
          <h1
            className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in-up delay-100 text-white"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Donde el estilo{" "}
            <span className="text-[var(--accent)]">define</span>
            <br />
            tu personalidad
          </h1>

          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto animate-fade-in-up delay-200">
            Cortes profesionales, atención personalizada y un ambiente exclusivo.
            Reserva tu cita online y vive la experiencia Filo Estilo.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link href="/reservar" className="btn-gold text-base !px-8 !py-3.5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reservar Ahora
            </Link>
            <Link href="/#servicios" className="btn-outline text-base !px-8 !py-3.5">
              Ver Servicios
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 animate-fade-in-up delay-400">
            {[
              { value: "5+", label: "Años de experiencia" },
              { value: "2K+", label: "Clientes satisfechos" },
              { value: "15+", label: "Estilos disponibles" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">{s.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <svg className="h-6 w-6 text-white/65" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                    <line x1="20" y1="4" x2="8.12" y2="15.88" />
                    <line x1="14.47" y1="14.48" x2="20" y2="20" />
                    <line x1="8.12" y1="8.12" x2="12" y2="12" />
                  </svg>
                ),
                title: "Cortadores Expertos",
                desc: "Barberos con años de experiencia y formación continua en las últimas tendencias.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Reservación Online",
                desc: "Elige tu servicio, barbero y horario desde cualquier dispositivo en segundos.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
                title: "Servicios Premium",
                desc: "Productos de primera calidad y atención personalizada para cada cliente.",
              },
            ].map((f) => (
              <div key={f.title} className="glass-card p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)]">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HIGHLIGHTS WITH IMAGES ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Experiencia</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Más que un corte, una <span className="text-[var(--accent)]">imagen</span>
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Ambiente Premium",
                desc: "Sillones cómodos, atención puntual y experiencia pensada para ti.",
                image:
                  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Detalles de Precisión",
                desc: "Perfilado y acabados finos en cada sesión de corte y barba.",
                image:
                  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Productos Profesionales",
                desc: "Usamos líneas premium para proteger tu cabello y piel.",
                image:
                  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80",
              },
            ].map((item) => (
              <article key={item.title} className="glass-card overflow-hidden">
                <img src={item.image} alt={item.title} className="h-52 w-full object-cover" />
                <div className="p-6">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES (from API) ─── */}
      <section id="servicios" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Catálogo</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Nuestros <span className="text-[var(--accent)]">Servicios</span>
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] max-w-lg mx-auto">
              Atención experta para cualquier estilo de corte, barba y tratamiento capilar.
            </p>
          </div>

          {services.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">Cargando servicios...</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <div key={s.id} className="glass-card p-6 flex flex-col justify-between group">
                  <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border)]">
                    <img
                      src={[
                        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1521498542256-5aeb47ba2b36?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?auto=format&fit=crop&w=1200&q=80",
                      ][i % 3]}
                      alt={s.name}
                      className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors">
                        {s.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-1 text-sm font-bold text-[var(--accent)]">
                        S/ {s.price}
                      </span>
                    </div>
                    {s.description && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {s.duration_minutes} min
                    </span>
                    <Link href="/reservar" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                      Reservar →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── SUCCESS STORIES CAROUSEL ─── */}
      <section className="py-24 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Resultados</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Casos de <span className="text-[var(--accent)]">Éxito</span>
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">Clientes reales, cambios reales.</p>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <img
                src={successStories[activeStory].image}
                alt={successStories[activeStory].name}
                className="h-64 md:h-72 lg:h-[460px] w-full object-cover object-center"
              />
              <div className="p-8 lg:p-10 flex flex-col justify-center lg:min-h-[460px]">
                <p className="text-sm uppercase tracking-wider text-[var(--accent)] font-semibold">
                  {successStories[activeStory].result}
                </p>
                <blockquote className="mt-4 text-xl leading-relaxed" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  “{successStories[activeStory].quote}”
                </blockquote>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">- {successStories[activeStory].name}</p>

                <div className="mt-8 flex gap-2">
                  {successStories.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveStory(idx)}
                      aria-label={`Ver caso ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        activeStory === idx ? "w-8 bg-[var(--accent)]" : "w-2.5 bg-[var(--border-strong)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROFESSIONAL SPECIALTIES (multi-branch friendly) ─── */}
      <section id="equipo" className="py-24 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Profesionales</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Nuestros <span className="text-[var(--accent)]">Especialistas</span>
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Talento distribuido en nuestras sedes para cada estilo de corte y barba.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Fade & Taper",
                description: "Desvanecidos limpios, proporción y acabado preciso.",
                image:
                  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Barba Premium",
                description: "Perfilado y diseño según tu tipo de rostro.",
                image:
                  "https://images.unsplash.com/photo-1521498542256-5aeb47ba2b36?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Corte Clásico",
                description: "Estilo tradicional con técnica moderna.",
                image:
                  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Asesoría de Look",
                description: "Recomendación profesional para tu imagen.",
                image:
                  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
              },
            ].map((item) => (
              <article key={item.title} className="glass-card overflow-hidden group">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Barberos activos", value: `${barbers.length || 8}+` },
              { label: "Sedes disponibles", value: "2+" },
              { label: "Atenciones mensuales", value: "500+" },
            ].map((item) => (
              <div key={item.label} className="glass-card p-6 text-center">
                <p className="text-3xl font-bold text-[var(--accent)]">{item.value}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/sedes" className="btn-outline">
              Ver sedes y equipo por local
            </Link>
          </div>
            </div>
        
      </section>

      {/* ─── CONTACT / CTA ─── */}
      <section id="contacto" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="section-label">Ubicación</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Visítanos
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Estamos esperándote en nuestro local, abierto de lunes a sábado.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: "Dirección",
                line1: "Calle Principal 123",
                line2: "Lima, Perú",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
                title: "Teléfono",
                line1: "+51 999 999 999",
                line2: "WhatsApp disponible",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Horario",
                line1: "Lun – Sáb: 9:00 – 20:00",
                line2: "Domingos: Cerrado",
              },
            ].map((c) => (
              <div key={c.title} className="glass-card p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)]">
                  {c.icon}
                </div>
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{c.line1}</p>
                <p className="text-sm text-[var(--text-muted)]">{c.line2}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="mt-16 glass-card p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />
            <h3
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              ¿Listo para un nuevo <span className="text-[var(--accent)]">look</span>?
            </h3>
            <p className="mt-3 text-[var(--text-secondary)] max-w-md mx-auto">
              Reserva tu cita en línea y recibe el corte perfecto sin esperas.
            </p>
            <div className="mt-8">
              <Link href="/reservar" className="btn-gold text-base !px-10 !py-3.5">
                Reservar Cita Ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
