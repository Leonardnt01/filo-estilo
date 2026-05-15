"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
};

export default function SedesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/booking/catalog")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="section-label">Sedes</span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Elige tu <span className="text-[var(--accent)]">Barbería</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">Selecciona una sede para ver servicios, equipo y reservar en segundos.</p>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="glass-card overflow-hidden">
                  <div className="h-44 w-full animate-pulse bg-[var(--bg-surface-hover)]" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    <div className="mt-4 flex items-center justify-between">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                      <div className="h-4 w-16 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">No hay sedes disponibles.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b, idx) => (
                <Link key={b.id} href={`/sedes/${b.slug}`} className="glass-card overflow-hidden group hover:border-[var(--accent-border)] transition-colors">
                  <img
                    src={[
                      "/images/home/sedes/sede-1.jpg",
                      "/images/home/sedes/sede-2.jpg",
                      "/images/home/sedes/sede-3.jpg",
                    ][idx % 3]}
                    alt={b.name}
                    className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="p-6">
                    <h2 className="text-lg font-semibold">{b.name}</h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{b.address ?? "Dirección por confirmar"}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{b.phone ?? "Teléfono por confirmar"}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-[var(--text-muted)]">Servicios y equipo disponibles</span>
                      <p className="text-sm font-semibold text-[var(--accent)]">Ver sede →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
