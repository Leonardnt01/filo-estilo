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
            <p className="text-center text-[var(--text-muted)]">Cargando sede...</p>
          ) : !branch ? (
            <div className="glass-card p-8 text-center">
              <h1 className="text-2xl font-bold">Sede no encontrada</h1>
              <Link href="/sedes" className="mt-4 inline-block text-[var(--accent)] font-semibold">Volver a sedes</Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
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

