import Image from "next/image";
import Link from "next/link";

import {
  DEFAULT_HOME_SETTINGS,
  type HomePageData,
} from "@/components/home-page-shared";

export default function HomePageStatic({
  initialData,
}: {
  initialData: HomePageData;
}) {
  const initialHomeSettings = initialData.site_settings?.public_home ?? {};
  const content = { ...DEFAULT_HOME_SETTINGS, ...initialHomeSettings };
  const valueCards =
    Array.isArray(content.value_cards) && content.value_cards.length > 0
      ? content.value_cards
      : DEFAULT_HOME_SETTINGS.value_cards;
  const experiencePoints =
    Array.isArray(content.experience_points) && content.experience_points.length > 0
      ? content.experience_points
      : DEFAULT_HOME_SETTINGS.experience_points;

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
    </>
  );
}
