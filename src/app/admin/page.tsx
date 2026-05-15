"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCachedJson } from "@/lib/admin-client-cache";

type Stats = {
  services: number;
  barbers: number;
  todayAppointments: number;
  pendingCount: number;
};

type Branch = {
  id: string;
  name: string;
};

export default function AdminDashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [stats, setStats] = useState<Stats>({ services: 0, barbers: 0, todayAppointments: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      const branchesJson = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
      const nextBranches = branchesJson.items ?? [];
      setBranches(nextBranches);
      const remembered = typeof window !== "undefined" ? localStorage.getItem("admin.branch_id") : "";
      const selected = (remembered && nextBranches.find((b) => b.id === remembered)?.id) || nextBranches[0]?.id || "";
      if (!branchId && selected) setBranchId(selected);
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const query = branchId && branchId !== "all" ? `branch_id=${branchId}` : "";
      
      const [sJson, bJson, aJson] = await Promise.all([
        fetchCachedJson<{ items?: unknown[] }>(`/api/admin/services?only_active=true&${query}`, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: unknown[] }>(`/api/admin/barbers?only_active=true&${query}`, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: { appointment_date: string; status: string; branch_id: string }[] }>(`/api/admin/appointments?limit=200&${query}`, { ttlMs: 10_000 }),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const appointments = aJson.items ?? [];
      const todayAppts = appointments.filter((a) => a.appointment_date === today);
      const pending = appointments.filter((a) => a.status === "pending");

      setStats({
        services: (sJson.items ?? []).length,
        barbers: (bJson.items ?? []).length,
        todayAppointments: todayAppts.length,
        pendingCount: pending.length,
      });
      setLoading(false);
    }
    void loadStats();
  }, [branchId]);
  useEffect(() => {
    if (branchId) localStorage.setItem("admin.branch_id", branchId);
  }, [branchId]);

  const cards = [
    { label: "Servicios Activos", value: stats.services, icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#3b82f6", href: "/admin/services" },
    { label: "Barberos Activos", value: stats.barbers, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "#a855f7", href: "/admin/barbers" },
    { label: "Citas Hoy", value: stats.todayAppointments, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#22c55e", href: "/admin/appointments" },
    { label: "Pendientes", value: stats.pendingCount, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "#f59e0b", href: "/admin/appointments" },
  ];

  return (
    <section>
      <div className="mb-10">
        <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
          Panel de <span style={{ color: "var(--accent)" }}>Control</span>
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">Visión general del negocio y rendimiento de sedes</p>

        {/* Branch Tabs Selector */}
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => setBranchId("all")}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all border ${
              branchId === "all" || !branchId
                ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-xl shadow-[var(--accent-soft)]"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            }`}
          >
            Vista General
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchId(b.id)}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all border ${
                branchId === b.id
                  ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-xl shadow-[var(--accent-soft)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {cards.map((c) => (
          <Link 
            key={c.label} 
            href={c.href} 
            className="admin-card group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95"
            style={{ borderLeft: `4px solid ${c.color}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                style={{ background: `${c.color}15`, color: c.color }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d={c.icon} />
                </svg>
              </div>
              {branchId === "all" && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Global</span>}
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
              {c.label}
            </p>
            <p className="text-4xl font-black transition-all" style={{ color: "var(--text-primary)" }}>
              {loading ? <span className="opacity-20 animate-pulse">00</span> : c.value}
            </p>
            <div 
              className="absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"
              style={{ color: c.color }}
            >
              <svg fill="currentColor" viewBox="0 0 24 24"><path d={c.icon} /></svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-10">
        {/* Branch Summary List */}
        <div className="lg:col-span-2 admin-card h-full">
          <h3 className="text-lg font-bold mb-6" style={{ fontFamily: "var(--font-playfair), serif" }}>Resumen por Sedes</h3>
          <div className="space-y-4">
            {branches.map((b) => (
              <div 
                key={b.id} 
                className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] transition-all cursor-pointer group"
                onClick={() => setBranchId(b.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-bold">
                    {b.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{b.name}</h4>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">Estado Operacional</p>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Activa</p>
                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Sede</p>
                  </div>
                  <svg className="h-5 w-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status indicator */}
        <div className="admin-card h-full flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-playfair), serif" }}>Estado de Red</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium mb-8">Rendimiento en tiempo real</p>
            
            <div className="space-y-6">
              {[
                { label: "Sincronización Cloud", value: "Excelente", color: "#22c55e" },
                { label: "Pasarela de Pagos", value: "Activa", color: "#22c55e" },
                { label: "Sistemas Locales", value: "En línea", color: "#22c55e" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">{s.label}</span>
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--border-strong)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] w-[95%] rounded-full shadow-[0_0_8px_var(--accent)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
            <button className="w-full btn-gold !py-3 font-bold text-sm">Ver Auditoría Completa</button>
          </div>
          
          <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-[var(--accent)] blur-[80px] opacity-10 pointer-events-none" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="admin-card">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          Acciones rápidas
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Gestionar Servicios", href: "/admin/services", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            { label: "Gestionar Barberos", href: "/admin/barbers", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
            { label: "Configurar Horarios", href: "/admin/business-hours", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Ver Todas las Citas", href: "/admin/appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-xl p-4 transition-all"
              style={{ border: "1px solid var(--border-strong)", background: "var(--bg-surface)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--accent-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d={a.icon} />
                </svg>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
