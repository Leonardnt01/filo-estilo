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
};

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number };
type Barber = { id: string; full_name: string; specialty: string | null };

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
                  src={
                    branch.slug === "sede-principal"
                      ? "https://www.businessempresarial.com.pe/wp-content/uploads/2025/09/Montalvo-For-Men-780x470.jpeg"
                      : branch.slug === "sede-norte"
                      ? "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop"
                      : "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"
                  }
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

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Servicios</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((s) => (
                    <div key={s.id} className="glass-card p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-[var(--accent)] font-bold">S/ {s.price}</p>
                      </div>
                      {s.description && <p className="mt-2 text-sm text-[var(--text-muted)]">{s.description}</p>}
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{s.duration_minutes} min</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Barberos</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {barbers.map((b) => (
                    <div key={b.id} className="glass-card p-5">
                      <p className="font-semibold">{b.full_name}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{b.specialty ?? "Barbero profesional"}</p>
                    </div>
                  ))}
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
