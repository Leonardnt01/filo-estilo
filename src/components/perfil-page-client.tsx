/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState } from "react";
import { Footer } from "@/components/footer";
import { useToast } from "@/components/toast";

type ProfileData = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "client";
  created_at: string | null;
};

type Stats = {
  total: number;
  completed: number;
  pending: number;
  upcoming: number;
};

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
};

type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};

type BranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export default function PerfilPageClient({
  initialProfile,
  initialStats,
  initialPromotions,
  footerSettings,
  footerBranchContact,
  initialError,
}: {
  initialProfile: ProfileData | null;
  initialStats: Stats | null;
  initialPromotions: Promotion[];
  footerSettings?: FooterSettings;
  footerBranchContact?: BranchContact | null;
  initialError: string | null;
}) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: initialProfile?.full_name ?? "",
    phone: initialProfile?.phone ?? "",
  });
  const [error, setError] = useState<string | null>(initialError);

  async function load() {
    setLoading(true);
    setError(null);
    const [profileRes, homeRes] = await Promise.all([
      fetch("/api/my/profile"),
      fetch("/api/home"),
    ]);
    const json = await profileRes.json().catch(() => ({}));
    const home = await homeRes.json().catch(() => ({}));
    setLoading(false);
    if (!profileRes.ok) {
      setError(json.error ?? "No se pudo cargar tu perfil");
      return;
    }
    setProfile(json.profile);
    setStats(json.stats);
    setPromotions(home.promotions ?? []);
    setForm({
      full_name: json.profile?.full_name ?? "",
      phone: json.profile?.phone ?? "",
    });
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        phone: form.phone.trim() ? form.phone.trim() : null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast(json.error ?? "No se pudo actualizar tu perfil", "error");
      return;
    }
    toast("Perfil actualizado");
    await load();
  }

  return (
    <>
      <main className="flex-1 pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8">
            <span className="section-label">Mi cuenta</span>
            <h1
              className="mt-4 text-3xl font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Mi <span className="text-[var(--accent)]">Perfil</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Administra tus datos, revisa tu actividad y aprovecha promociones.
            </p>
          </div>

          {error && <div className="alert-error mb-6">{error}</div>}

          {loading ? (
            <div className="glass-card p-6">Cargando perfil...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Información personal
                  </h2>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm mb-1.5 text-[var(--text-secondary)]">
                        Nombre completo
                      </label>
                      <input
                        className="input-dark"
                        value={form.full_name}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, full_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1.5 text-[var(--text-secondary)]">
                        Correo
                      </label>
                      <input
                        className="input-dark opacity-80"
                        value={profile?.email ?? ""}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1.5 text-[var(--text-secondary)]">
                        Teléfono
                      </label>
                      <input
                        className="input-dark"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, phone: e.target.value }))
                        }
                        placeholder="+51 999 999 999"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-gold !rounded-xl !py-2.5"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </form>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--accent)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12h9c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125h-9a1.125 1.125 0 0 1-1.125-1.125V7.125C5.25 6.504 5.754 6 6.375 6ZM21 12H3" />
                    </svg>
                    Promociones para ti
                  </h2>
                  <div className="grid gap-4">
                    {(promotions.length > 0 ? promotions : [
                      { id: "fallback-1", title: "Promociones semanales", description: "Consulta nuestras promociones activas en sedes y reserva con descuento.", discount_percent: null },
                    ]).map((promo) => (
                      <article
                        key={promo.id}
                        className="relative rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--accent-soft)]/5 transition-all duration-300 p-4 overflow-hidden group cursor-pointer"
                        style={{ borderLeft: `4px solid ${promo.discount_percent ? "var(--accent)" : "var(--border-strong)"}` }}
                      >
                        {/* Decorative background badge */}
                        <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-110 text-[var(--accent)] transition-all duration-500">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.562 3.077c.552-.552 1.45-.552 2.002 0l.004.004a1.416 1.416 0 0 1 .414 1.001v.004c0 .375.149.734.414.999l.004.004c.552.552 1.45.552 2.002 0l.004-.004a1.416 1.416 0 0 1 1.001-.414h.004c.375 0 .734.149.999.414l.004.004c.552.552.552 1.45 0 2.002l-.004.004a1.416 1.416 0 0 1-.414 1.001v.004c0 .375-.149.734-.414.999l-.004.004c-.552.552-.552 1.45 0 2.002l.004.004a1.416 1.416 0 0 1 .414 1.001v.004c0 .375.149.734.414.999l-.004.004c-.552.552-1.5 0-2.002 0l-.004-.004a1.416 1.416 0 0 1-1.001-.414h-.004c-.375 0-.734-.149-.999-.414l-.004-.004c-.552-.552-1.45-.552-2.002 0l-.004.004a1.416 1.416 0 0 1-1.001.414h-.004c-.375 0-.734.149-.999.414l-.004-.004c-.552-.552-.552-1.45 0-2.002l.004-.004a1.416 1.416 0 0 1 .414-1.001v-.004c0-.375.149-.734.414-.999l.004-.004c.552-.552.552-1.45 0-2.002l-.004-.004a1.416 1.416 0 0 1-.414-1.001v-.004c0-.375-.149-.734-.414-.999l.004-.004Z" />
                          </svg>
                        </div>
                        
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{promo.title}</h3>
                            <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                              {promo.description ?? "Promoción disponible por tiempo limitado."}
                            </p>
                          </div>
                          
                          <div className="shrink-0 flex flex-col items-end">
                            <span className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-black tracking-tight text-[var(--accent)] shadow-sm shadow-[var(--accent-soft)]/20 uppercase">
                              {promo.discount_percent ? `${promo.discount_percent}% OFF` : "Activa"}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold mb-4">Tu actividad</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Total citas" value={stats?.total ?? 0} />
                    <StatCard
                      label="Completadas"
                      value={stats?.completed ?? 0}
                    />
                    <StatCard label="Activas" value={stats?.pending ?? 0} />
                    <StatCard label="Próximas" value={stats?.upcoming ?? 0} />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold mb-3">Cuenta</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Rol:{" "}
                    <span className="text-[var(--text-primary)] font-medium">
                      {profile?.role ?? "client"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Miembro desde:{" "}
                    <span className="text-[var(--text-primary)] font-medium">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString(
                            "es-PE",
                          )
                        : "—"}
                    </span>
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer initialSettings={footerSettings} initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--accent)]">{value}</p>
    </div>
  );
}
