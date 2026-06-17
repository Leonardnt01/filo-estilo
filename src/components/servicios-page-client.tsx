"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/footer";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  branch_id: string | null;
};

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
};

type DurationFilter = "all" | "quick" | "standard" | "premium";
type SortFilter = "recommended" | "price_asc" | "price_desc" | "duration_asc" | "name_asc";

const CARD_IMAGES = [
  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=900&auto=format&fit=crop",
];

type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};

export default function ServiciosPageClient({
  initialServices,
  initialBranches,
  footerSettings,
}: {
  initialServices: Service[];
  initialBranches: Branch[];
  footerSettings?: FooterSettings;
}) {
  const [services] = useState<Service[]>(initialServices);
  const [branches] = useState<Branch[]>(initialBranches);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [sortBy, setSortBy] = useState<SortFilter>("recommended");
  const [minPrice, setMinPrice] = useState(() => {
    const prices = initialServices.map((s) => s.price);
    return prices.length ? Math.floor(Math.min(...prices)) : 0;
  });
  const [maxPrice, setMaxPrice] = useState(() => {
    const prices = initialServices.map((s) => s.price);
    return prices.length ? Math.ceil(Math.max(...prices)) : 500;
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const globalMinPrice = useMemo(() => {
    if (!services.length) return 0;
    return Math.floor(Math.min(...services.map((s) => s.price)));
  }, [services]);

  const globalMaxPrice = useMemo(() => {
    if (!services.length) return 500;
    return Math.ceil(Math.max(...services.map((s) => s.price)));
  }, [services]);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const priceRange = Math.max(globalMaxPrice - globalMinPrice, 1);
  const minPercent = ((minPrice - globalMinPrice) / priceRange) * 100;
  const maxPercent = ((maxPrice - globalMinPrice) / priceRange) * 100;
  const activeFiltersCount =
    selectedBranches.length +
    (duration !== "all" ? 1 : 0) +
    (sortBy !== "recommended" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (minPrice !== globalMinPrice || maxPrice !== globalMaxPrice ? 1 : 0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = services.filter((service) => {
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        (service.description ?? "").toLowerCase().includes(query);

      const matchesBranch =
        selectedBranches.length === 0 ||
        (service.branch_id && selectedBranches.includes(service.branch_id));

      const matchesDuration =
        duration === "all" ||
        (duration === "quick" && service.duration_minutes <= 30) ||
        (duration === "standard" && service.duration_minutes > 30 && service.duration_minutes <= 45) ||
        (duration === "premium" && service.duration_minutes > 45);

      const matchesPrice = service.price >= minPrice && service.price <= maxPrice;

      return matchesSearch && matchesBranch && matchesDuration && matchesPrice;
    });

    const sorted = [...base];
    if (sortBy === "price_asc") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "duration_asc") sorted.sort((a, b) => a.duration_minutes - b.duration_minutes);
    if (sortBy === "name_asc") sorted.sort((a, b) => a.name.localeCompare(b.name));

    return sorted;
  }, [services, search, selectedBranches, duration, minPrice, maxPrice, sortBy]);

  function toggleBranch(branchId: string) {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedBranches([]);
    setDuration("all");
    setSortBy("recommended");
    setMinPrice(globalMinPrice);
    setMaxPrice(globalMaxPrice);
  }

  function renderFiltersPanel() {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-[var(--bg-surface-hover)]" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`skeleton-filter-${idx}`} className="h-12 w-full animate-pulse rounded-lg bg-[var(--bg-surface-hover)]" />
            ))}
          </div>
          <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--bg-surface-hover)]" />
        </div>
      );
    }

    return (
      <div>
        <div>
          <h3 className="font-semibold text-lg">Filtros</h3>
          <p className="text-xs text-[var(--text-muted)]">Marca lo que quieres ver</p>
        </div>

        <div className="input-icon-wrap with-left-icon mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio..."
            className="input-dark"
          />
          <div className="input-icon-left">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Sedes</p>
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5">
              <input
                type="checkbox"
                checked={selectedBranches.includes(branch.id)}
                onChange={() => toggleBranch(branch.id)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="text-sm">
                <span className="block font-medium">{branch.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{branch.address ?? "Sin dirección"}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Duración</p>
          {[
            { key: "all", label: "Todos" },
            { key: "quick", label: "Rápidos (<=30m)" },
            { key: "standard", label: "Estándar (31-45m)" },
            { key: "premium", label: "Premium (+45m)" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 text-sm">
              <input
                type="checkbox"
                checked={duration === item.key}
                onChange={() => setDuration(item.key as DurationFilter)}
                className="accent-[var(--accent)]"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Orden</p>
          {[
            { key: "recommended", label: "Recomendados" },
            { key: "price_asc", label: "Precio menor a mayor" },
            { key: "price_desc", label: "Precio mayor a menor" },
            { key: "duration_asc", label: "Duración menor a mayor" },
            { key: "name_asc", label: "Nombre A-Z" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 text-sm">
              <input
                type="checkbox"
                checked={sortBy === item.key}
                onChange={() => setSortBy(item.key as SortFilter)}
                className="accent-[var(--accent)]"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Rango de precio (S/)</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="relative h-8">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--border)]" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
              />
              <input
                type="range"
                min={globalMinPrice}
                max={globalMaxPrice}
                value={minPrice}
                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                className="pointer-events-none absolute left-0 top-1/2 z-20 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow"
              />
              <input
                type="range"
                min={globalMinPrice}
                max={globalMaxPrice}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                className="pointer-events-none absolute left-0 top-1/2 z-30 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-medium">
              <span>S/ {minPrice}</span>
              <span>S/ {maxPrice}</span>
            </div>
          </div>
        </div>

        <button type="button" onClick={clearFilters} className="btn-outline mt-4 w-full !py-2.5">Limpiar filtros</button>
      </div>
    );
  }

  return (
    <>
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 text-center">
            <span className="section-label">Servicios</span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Catálogo Completo
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Busca, filtra y reserva el servicio perfecto por sede, precio y duración.
            </p>
          </div>

          <section className="space-y-6 lg:flex lg:items-start lg:gap-6 lg:space-y-0">
            <aside className="hidden glass-card h-fit space-y-4 p-5 lg:sticky lg:top-24 lg:block lg:w-[320px] lg:flex-none">
              {renderFiltersPanel()}
            </aside>

            <div className="min-w-0 space-y-4 lg:flex-1">
              <div className="space-y-3 lg:hidden">
                <div className="input-icon-wrap with-left-icon">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar servicio..."
                    className="input-dark"
                  />
                  <div className="input-icon-left">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
                    </svg>
                  </div>
                </div>

                <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1">
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(true)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold"
                  >
                    <svg className="h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M6 12h12M10 18h4" />
                    </svg>
                    Filtros
                    {activeFiltersCount > 0 && (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--bg-primary)]">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy("recommended")}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                      sortBy === "recommended"
                        ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    Recomendados
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("price_asc")}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                      sortBy === "price_asc"
                        ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    Precio menor
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("price_desc")}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                      sortBy === "price_desc"
                        ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    Precio mayor
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  Mostrando <strong className="text-[var(--text-primary)]">{filtered.length}</strong> de {services.length} servicios
                </p>

                {selectedBranches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedBranches.map((branchId) => {
                      const branch = branchMap.get(branchId);
                      if (!branch) return null;
                      return (
                        <button
                          key={branch.id}
                          onClick={() => toggleBranch(branch.id)}
                          className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]"
                        >
                          {branch.name} ×
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={`service-skeleton-${idx}`} className="min-h-[290px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4">
                      <div className="h-36 w-full animate-pulse rounded-xl bg-[var(--bg-surface-hover)]" />
                      <div className="mt-4 space-y-3">
                        <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                        <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                        <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                        <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                        <div className="mt-2 flex items-center justify-between">
                          <div className="h-5 w-16 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                          <div className="h-4 w-12 animate-pulse rounded bg-[var(--bg-surface-hover)]" />
                        </div>
                        <div className="h-9 w-24 animate-pulse rounded-full bg-[var(--bg-surface-hover)]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="glass-card p-10 text-center text-[var(--text-muted)]">
                  No se encontraron servicios con esos filtros.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((service, idx) => {
                    const branch = service.branch_id ? branchMap.get(service.branch_id) : null;
                    return (
                      <article key={service.id} className="group relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] min-h-[290px]">
                        <Image
                          src={CARD_IMAGES[idx % CARD_IMAGES.length]}
                          alt={service.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                        <div className="relative z-10 flex h-full flex-col justify-end p-4">
                          {branch && (
                            <p className="mb-1 text-[11px] uppercase tracking-wider text-[var(--accent)]">
                              {branch.name}
                            </p>
                          )}
                          <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-white/75">
                            {service.description ?? "Servicio premium de barbería."}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-base font-bold text-[var(--accent)]">S/ {service.price}</span>
                            <span className="text-xs text-white/85">{service.duration_minutes} min</span>
                          </div>
                          <Link
                            href={`/reservar?service_id=${service.id}`}
                            className="mt-3 inline-flex w-fit items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--bg-primary)]"
                          >
                            Reservar
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      {showMobileFilters && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters(false)}
            className="absolute inset-0 bg-black/65"
            aria-label="Cerrar filtros"
          />
          <div className="absolute right-0 top-0 h-full w-[90vw] max-w-[430px] overflow-hidden border-l border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="text-xl leading-none text-[var(--text-secondary)]"
              >
                ×
              </button>
              <h3 className="text-lg font-semibold">Filtrar por</h3>
              <div className="w-6" />
            </div>

            <div className="h-[calc(100%-150px)] overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">Ordenar por</p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {[
                      { key: "recommended", label: "Recomendados" },
                      { key: "price_asc", label: "Precio menor a mayor" },
                      { key: "price_desc", label: "Precio mayor a menor" },
                      { key: "duration_asc", label: "Duración menor a mayor" },
                      { key: "name_asc", label: "Nombre A-Z" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setSortBy(item.key as SortFilter)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${
                          sortBy === item.key
                            ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <details open className="rounded-xl border border-[var(--border)]">
                  <summary className="cursor-pointer list-none p-3 text-sm font-semibold">Sedes</summary>
                  <div className="space-y-2 border-t border-[var(--border)] p-3 pt-2">
                    {branches.map((branch) => (
                      <label key={branch.id} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.id)}
                          onChange={() => toggleBranch(branch.id)}
                          className="mt-0.5 accent-[var(--accent)]"
                        />
                        <span className="text-sm">
                          <span className="block font-medium">{branch.name}</span>
                          <span className="text-xs text-[var(--text-muted)]">{branch.address ?? "Sin dirección"}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </details>

                <details open className="rounded-xl border border-[var(--border)]">
                  <summary className="cursor-pointer list-none p-3 text-sm font-semibold">Duración</summary>
                  <div className="space-y-2 border-t border-[var(--border)] p-3 pt-2">
                    {[
                      { key: "all", label: "Todos" },
                      { key: "quick", label: "Rápidos (<=30m)" },
                      { key: "standard", label: "Estándar (31-45m)" },
                      { key: "premium", label: "Premium (+45m)" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={duration === item.key}
                          onChange={() => setDuration(item.key as DurationFilter)}
                          className="accent-[var(--accent)]"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </details>

                <details open className="rounded-xl border border-[var(--border)]">
                  <summary className="cursor-pointer list-none p-3 text-sm font-semibold">Precio</summary>
                  <div className="border-t border-[var(--border)] p-3 pt-2">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                      <div className="relative h-8">
                        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--border)]" />
                        <div
                          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                        />
                        <input
                          type="range"
                          min={globalMinPrice}
                          max={globalMaxPrice}
                          value={minPrice}
                          onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                          className="pointer-events-none absolute left-0 top-1/2 z-20 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow"
                        />
                        <input
                          type="range"
                          min={globalMinPrice}
                          max={globalMaxPrice}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                          className="pointer-events-none absolute left-0 top-1/2 z-30 h-8 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm font-medium">
                        <span>S/ {minPrice}</span>
                        <span>S/ {maxPrice}</span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] p-4">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)]"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer initialSettings={footerSettings} />
    </>
  );
}
