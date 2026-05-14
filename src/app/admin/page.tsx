"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
      const branchesRes = await fetch("/api/admin/branches");
      const branchesJson = await branchesRes.json().catch(() => ({}));
      if (!branchesRes.ok) return;
      const nextBranches = branchesJson.items ?? [];
      setBranches(nextBranches);
      if (!branchId && nextBranches[0]?.id) {
        setBranchId(nextBranches[0].id);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!branchId) return;
      setLoading(true);
      const [sRes, bRes, aRes] = await Promise.all([
        fetch(`/api/admin/services?only_active=true&branch_id=${branchId}`),
        fetch(`/api/admin/barbers?only_active=true&branch_id=${branchId}`),
        fetch(`/api/admin/appointments?limit=100&branch_id=${branchId}`),
      ]);
      const sJson = await sRes.json().catch(() => ({}));
      const bJson = await bRes.json().catch(() => ({}));
      const aJson = await aRes.json().catch(() => ({}));

      const today = new Date().toISOString().slice(0, 10);
      const appointments = aJson.items ?? [];
      const todayAppts = appointments.filter((a: { appointment_date: string }) => a.appointment_date === today);
      const pending = appointments.filter((a: { status: string }) => a.status === "pending");

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

  const cards = [
    { label: "Servicios Activos", value: stats.services, icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#3b82f6", href: "/admin/services" },
    { label: "Barberos Activos", value: stats.barbers, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "#a855f7", href: "/admin/barbers" },
    { label: "Citas Hoy", value: stats.todayAppointments, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#22c55e", href: "/admin/appointments" },
    { label: "Pendientes", value: stats.pendingCount, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "#f59e0b", href: "/admin/appointments" },
  ];

  return (
    <section>
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Panel de <span style={{ color: "var(--accent)" }}>Control</span>
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Resumen general por sede
            </p>
          </div>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="admin-select min-w-56"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="stat-card group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {c.label}
              </span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${c.color}15`, color: c.color }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d={c.icon} />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {loading ? "..." : c.value}
            </p>
          </Link>
        ))}
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
