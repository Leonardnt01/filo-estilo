"use client";

import { useCallback, useEffect, useState } from "react";
import { Footer } from "@/components/footer";
import { useToast } from "@/components/toast";
import {
  COUPON_ELIGIBILITY_THRESHOLD,
  PROMO_CATALOG,
  getPromoByKey,
  type CouponEligibility,
  type UserCoupon,
} from "@/lib/coupons";

type ProfileData = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "client";
  created_at: string | null;
};

type Stats = { total: number; completed: number; pending: number; upcoming: number };

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

type BranchContact = { address?: string | null; phone?: string | null; whatsapp?: string | null };

// ── Small shared glyphs (line-art, on brand — no emoji) ──────────────
function Glyph({ d, className = "h-5 w-5", strokeWidth = 1.6 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICON = {
  ticket: "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2 2 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2 2 0 0 0 0-5V8Z",
  ticketDash: "M14 6.5v11",
  clock: "M12 8v4l2.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  crown: "M4 17.5 2.5 8l5.5 3.8L12 5l3.5 6.8L21.5 8 20 17.5H4Zm0 2.5h16",
  check: "m5 13 4 4L19 7",
  lock: "M6 10V8a6 6 0 1 1 12 0v2m-9 0h6a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z",
  spark: "M12 3v4m0 10v4m9-9h-4M7 12H3m14.5-6.5-2.8 2.8M9.3 14.7l-2.8 2.8m11 0-2.8-2.8M9.3 9.3 6.5 6.5",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FE";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

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

  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [eligibility, setEligibility] = useState<CouponEligibility | null>(null);
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const activeCoupons = coupons.filter((c) => c.status === "active");

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/my/coupons", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setCoupons(json.coupons ?? []);
        setEligibility(json.eligibility ?? null);
      }
    } catch {
      // Coupons are a bonus; never block the profile.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCoupons();
  }, [loadCoupons]);

  async function load() {
    setLoading(true);
    setError(null);
    const [profileRes, homeRes] = await Promise.all([fetch("/api/my/profile"), fetch("/api/home")]);
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
    setForm({ full_name: json.profile?.full_name ?? "", phone: json.profile?.phone ?? "" });
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: form.full_name, phone: form.phone.trim() ? form.phone.trim() : null }),
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

  async function claimCoupon(promoKey: string) {
    setClaimingKey(promoKey);
    try {
      const res = await fetch("/api/my/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_key: promoKey }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json.error ?? "No se pudo obtener el cupón", "error");
        return;
      }
      toast("Cupón agregado a tu perfil");
      await loadCoupons();
    } finally {
      setClaimingKey(null);
    }
  }

  const memberName = profile?.full_name || "Cliente";
  const firstName = memberName.split(" ")[0];

  return (
    <>
      <main className="flex-1 pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          {/* ── Hero ── */}
          <div className="relative mb-8 overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--bg-secondary)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl" />
            <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-[var(--accent)] opacity-20 blur-md" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent text-2xl font-black text-[var(--accent)] shadow-inner" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    {getInitials(memberName)}
                  </div>
                </div>
                <div>
                  <span className="section-label !py-1">Mi cuenta</span>
                  <h1 className="mt-2.5 text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    Hola, <span className="text-[var(--accent)]">{firstName}</span>
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--text-secondary)]">
                    <span>{profile?.email ?? ""}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span>Miembro desde {formatDate(profile?.created_at ?? null)}</span>
                  </p>
                </div>
              </div>

              {/* Golden ticket button */}
              <button
                onClick={() => setShowDiscounts(true)}
                className="group relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] px-6 py-4 text-left text-[#1f1605] shadow-[0_10px_30px_-8px_rgba(212,168,67,0.55)] transition-all hover:shadow-[0_14px_38px_-8px_rgba(212,168,67,0.7)] active:scale-[0.97]"
              >
                <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-white/25 blur-md transition-all duration-700 group-hover:left-[130%]" />
                <span className="relative flex items-center gap-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10">
                    <span className="relative">
                      <Glyph d={ICON.ticket} className="h-6 w-6" strokeWidth={1.5} />
                      <svg className="absolute inset-0 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray="2 2"><path d={ICON.ticketDash} /></svg>
                    </span>
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-black uppercase tracking-[0.14em]">Descuentos del Día</span>
                    <span className="text-[11px] font-bold opacity-80">
                      {activeCoupons.length > 0 ? `${activeCoupons.length} cupón${activeCoupons.length === 1 ? "" : "es"} activo${activeCoupons.length === 1 ? "" : "s"}` : "Reclama tus beneficios"}
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </div>

          {error && <div className="alert-error mb-6">{error}</div>}

          {loading ? (
            <div className="glass-card p-6">Cargando perfil...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-6">
                {/* Información personal */}
                <div className="glass-card p-6">
                  <SectionHeading d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.63Z" title="Información personal" />
                  <form onSubmit={saveProfile} className="mt-5 space-y-4">
                    <Field label="Nombre completo">
                      <input className="input-dark" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} required />
                    </Field>
                    <Field label="Correo">
                      <input className="input-dark opacity-70" value={profile?.email ?? ""} disabled />
                    </Field>
                    <Field label="Teléfono">
                      <input className="input-dark" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+51 999 999 999" />
                    </Field>
                    <button type="submit" disabled={saving} className="btn-gold !rounded-xl !py-2.5">
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </form>
                </div>

                {/* Mis cupones */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between">
                    <SectionHeading d={ICON.ticket} title="Mis cupones" inline />
                    <button onClick={() => setShowDiscounts(true)} className="text-xs font-bold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]">
                      Ver descuentos →
                    </button>
                  </div>

                  {activeCoupons.length === 0 ? (
                    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)]/20 px-6 py-9 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Glyph d={ICON.ticket} className="h-7 w-7" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Aún no tienes cupones activos</p>
                      <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">
                        Abre <span className="font-semibold text-[var(--accent)]">Descuentos del Día</span> y reclama tus beneficios de cortesía.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {activeCoupons.map((coupon) => {
                        const promo = getPromoByKey(coupon.promo_key);
                        return <CouponVoucher key={coupon.id} icon={promo?.icon} title={coupon.title} description={coupon.description} expiresAt={coupon.expires_at} />;
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Sidebar */}
              <aside className="space-y-6">
                <div className="glass-card p-6">
                  <SectionHeading d="M3 13.5 12 4l9 9.5M5.5 11v8.5A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V11" title="Tu actividad" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <StatCard label="Total citas" value={stats?.total ?? 0} />
                    <StatCard label="Completadas" value={stats?.completed ?? 0} accent />
                    <StatCard label="Activas" value={stats?.pending ?? 0} />
                    <StatCard label="Próximas" value={stats?.upcoming ?? 0} />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <SectionHeading d={ICON.spark} title="Promociones para ti" />
                  <div className="mt-5 space-y-3">
                    {(promotions.length > 0
                      ? promotions
                      : [{ id: "fallback-1", title: "Promociones semanales", description: "Consulta nuestras promociones activas en sedes y reserva con descuento.", discount_percent: null }]
                    ).map((promo) => (
                      <article key={promo.id} className="group relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--accent-border)]">
                        <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-[var(--accent)] opacity-70" />
                        <div className="flex items-start justify-between gap-3 pl-2.5">
                          <div>
                            <h3 className="font-bold text-[var(--text-primary)]">{promo.title}</h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{promo.description ?? "Promoción disponible por tiempo limitado."}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--accent)]">
                            {promo.discount_percent ? `${promo.discount_percent}% OFF` : "Activa"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {showDiscounts && (
        <DiscountsModal
          eligibility={eligibility}
          activeCoupons={activeCoupons}
          claimingKey={claimingKey}
          onClaim={claimCoupon}
          onClose={() => setShowDiscounts(false)}
        />
      )}

      <Footer initialSettings={footerSettings} initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}

// ── Reusable pieces ─────────────────────────────────────────────────

function SectionHeading({ d, title, inline = false }: { d: string; title: string; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${inline ? "" : ""}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Glyph d={d} className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <h2 className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-playfair), serif" }}>
        {title}
      </h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-[var(--accent-border)] bg-[var(--accent-soft)]/40" : "border-[var(--border-strong)] bg-[var(--bg-secondary)]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 text-3xl font-black leading-none text-[var(--accent)]" style={{ fontFamily: "var(--font-playfair), serif" }}>{value}</p>
    </div>
  );
}

function CouponVoucher({ icon, title, description, expiresAt }: { icon?: string; title: string; description: string | null; expiresAt: string }) {
  return (
    <article className="relative flex overflow-hidden rounded-2xl border border-[var(--accent-border)] bg-gradient-to-r from-[var(--accent-soft)]/50 to-[var(--bg-secondary)]">
      <div className="flex items-center pl-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--bg-primary)]/40 text-[var(--accent)]">
          <Glyph d={icon ?? ""} className="h-6 w-6" />
        </div>
      </div>
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <span className="shrink-0 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-[var(--accent)]">
            Recomendada
          </span>
        </div>
        {description && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">{description}</p>}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <Glyph d="M12 8v4l2.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" className="h-3 w-3" strokeWidth={2} />
          Vence {new Date(expiresAt).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
        </div>
      </div>
      <div className="relative flex w-12 items-center justify-center border-l-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)]/30">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]" style={{ writingMode: "vertical-rl" }}>
          Gratis
        </span>
      </div>
    </article>
  );
}

// ── Discounts modal ─────────────────────────────────────────────────

function DiscountsModal({
  eligibility,
  activeCoupons,
  claimingKey,
  onClaim,
  onClose,
}: {
  eligibility: CouponEligibility | null;
  activeCoupons: UserCoupon[];
  claimingKey: string | null;
  onClaim: (promoKey: string) => void;
  onClose: () => void;
}) {
  const eligible = eligibility?.eligible ?? false;
  const missing = eligibility?.missing ?? COUPON_ELIGIBILITY_THRESHOLD;
  const completed = eligibility?.completedCount ?? 0;
  const ownedKeys = new Set(activeCoupons.map((c) => c.promo_key));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[var(--accent-border)] bg-[var(--bg-surface)] shadow-2xl animate-fade-in">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors hover:text-red-500"
          aria-label="Cerrar"
        >
          <Glyph d="M6 18 18 6M6 6l12 12" className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="relative p-7 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent text-[var(--accent)]">
              <Glyph d={ICON.crown} className="h-8 w-8" strokeWidth={1.5} />
            </div>
            {eligible ? (
              <>
                <h2 className="mt-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  ¡Ganaste tus <span className="text-[var(--accent)]">Descuentos</span>!
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                  Por tus <span className="font-bold text-[var(--text-primary)]">{completed} citas completadas</span>, reclama estos beneficios de cortesía.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Descuentos del <span className="text-[var(--accent)]">Día</span>
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                  Te{" "}
                  <span className="mx-0.5 rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 font-black text-[var(--accent)]">
                    faltan {missing} cita{missing === 1 ? "" : "s"}
                  </span>{" "}
                  completada{missing === 1 ? "" : "s"} para desbloquear estos beneficios.
                </p>
              </>
            )}
          </div>

          {/* Coupons */}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {PROMO_CATALOG.map((promo) => {
              const owned = ownedKeys.has(promo.key);
              const isClaiming = claimingKey === promo.key;
              const disabled = !eligible || owned || isClaiming;

              return (
                <div
                  key={promo.key}
                  className={`relative overflow-hidden rounded-2xl border bg-[var(--bg-secondary)] transition-all ${
                    eligible ? "border-[var(--accent-border)]" : "border-[var(--border-strong)] opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-3.5 p-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${eligible ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-strong)] bg-[var(--bg-primary)]/40 text-[var(--text-muted)]"}`}>
                      <Glyph d={eligible ? promo.icon : ICON.lock} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{promo.title}</h3>
                        <span className="shrink-0 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-[var(--accent)]">
                          {promo.perk}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{promo.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[var(--border-strong)] p-3">
                    <button
                      onClick={() => onClaim(promo.key)}
                      disabled={disabled}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                        owned
                          ? "cursor-default border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : !eligible
                          ? "cursor-not-allowed border border-[var(--border-strong)] bg-[var(--bg-primary)]/40 text-[var(--text-muted)]"
                          : "bg-[var(--accent)] text-[#1f1605] hover:brightness-105 active:scale-[0.98]"
                      } ${isClaiming ? "opacity-60" : ""}`}
                    >
                      {owned ? (
                        <>
                          <Glyph d={ICON.check} className="h-3.5 w-3.5" strokeWidth={2.5} /> Ya obtenido
                        </>
                      ) : isClaiming ? (
                        "Obteniendo..."
                      ) : !eligible ? (
                        <>
                          <Glyph d={ICON.lock} className="h-3.5 w-3.5" strokeWidth={2} /> Bloqueado
                        </>
                      ) : (
                        "Obtener descuento"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
            Los cupones vencen a los 15 días. Podrás canjearlos al reservar tu próxima cita.
          </p>
        </div>
      </div>
    </div>
  );
}
