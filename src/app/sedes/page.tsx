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
          <div className="mb-10 text-center">
            <span className="section-label">Sedes</span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Elige tu <span className="text-[var(--accent)]">Barbería</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">Selecciona una sede para ver servicios y reservar.</p>
          </div>

          {loading ? (
            <p className="text-center text-[var(--text-muted)]">Cargando sedes...</p>
          ) : branches.length === 0 ? (
            <p className="text-center text-[var(--text-muted)]">No hay sedes disponibles.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => (
                <Link key={b.id} href={`/sedes/${b.slug}`} className="glass-card p-6 hover:border-[var(--accent-border)] transition-colors">
                  <h2 className="text-lg font-semibold">{b.name}</h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{b.address ?? "Dirección por confirmar"}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{b.phone ?? "Teléfono por confirmar"}</p>
                  <p className="mt-4 text-sm font-semibold text-[var(--accent)]">Ver sede →</p>
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

