/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { AdminAppointmentsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/admin-client-cache";

type Appointment = {
  id: string; customer_name: string | null; customer_phone: string | null;
  appointment_date: string; start_time: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string | null; barber_id?: string; service_id?: string;
};

type OptionItem = { id: string; full_name?: string; name?: string };
type Branch = { id: string; name: string };

const STATUSES: Appointment["status"][] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const STATUS_CONFIG: Record<Appointment["status"], { label: string; color: string; icon: string; bg: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  confirmed: { label: "Confirmada", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  in_progress: { label: "En progreso", color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", icon: "M7 21h10M12 3v18M3 12h18" },
  completed: { label: "Completada", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", icon: "M5 13l4 4L19 7" },
  cancelled: { label: "Cancelada", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", icon: "M6 18L18 6M6 6l12 12" },
  no_show: { label: "No asistió", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
};

export default function AdminAppointmentsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [barbers, setBarbers] = useState<OptionItem[]>([]);
  const [services, setServices] = useState<OptionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState("20");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);

  async function loadOptions() {
    if (!branchFilter) return;
    try {
      const [bJson, sJson] = await Promise.all([
        fetchCachedJson<{ items?: OptionItem[] }>(`/api/admin/barbers?branch_id=${branchFilter}`, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: OptionItem[] }>(`/api/admin/services?branch_id=${branchFilter}`, { ttlMs: 20_000 }),
      ]);
      setBarbers(bJson.items ?? []);
      setServices(sJson.items ?? []);
    } catch {
      // fail silently in options to avoid blocking list render
    }
  }

  async function load() {
    if (!branchFilter) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (branchFilter) params.set("branch_id", branchFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (barberFilter) params.set("barber_id", barberFilter);
    if (serviceFilter) params.set("service_id", serviceFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (limit) params.set("limit", limit);
    try {
      const json = await fetchCachedJson<{ items?: Appointment[] }>(`/api/admin/appointments?${params.toString()}`, { ttlMs: 10_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar citas", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadBranches() {
      setBranchesLoading(true);
      try {
        const json = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
        const nextBranches = json.items ?? [];
        const remembered = typeof window !== "undefined" ? localStorage.getItem("admin.branch_id") : "";
        const selected = (remembered && nextBranches.find((b) => b.id === remembered)?.id) || nextBranches[0]?.id || "";
        setBranches(nextBranches);
        if (!branchFilter && selected) setBranchFilter(selected);
      } finally {
        setBranchesLoading(false);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!branchFilter) return;
    void loadOptions();
    void load();
  }, [branchFilter]);
  useEffect(() => {
    if (branchFilter) localStorage.setItem("admin.branch_id", branchFilter);
  }, [branchFilter]);

  async function applyFilters() { await load(); }
  async function clearFilters() {
    setStatusFilter(""); setBarberFilter(""); setServiceFilter("");
    setDateFrom(""); setDateTo(""); setLimit("20");
    setTimeout(() => { void load(); }, 0);
  }

  async function changeStatus(id: string, status: Appointment["status"]) {
    setSavingId(id);
    const res = await fetch(`/api/admin/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSavingId(null);
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo cambiar estado", "error"); return; }
    invalidateCacheByPrefix("/api/admin/appointments");
    
    // Actualización local inmediata
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    
    toast(`Cita marcada como ${STATUS_CONFIG[status].label}`);
  }

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Citas</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} citas encontradas</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="admin-btn">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          {showFilters ? "Ocultar Filtros" : "Filtros"}
        </button>
      </div>
      )}

      {showFilters && (
        <div className="admin-card space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Filtros de búsqueda</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="admin-select">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select">
              <option value="">Estado: todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)} className="admin-select">
              <option value="">Barbero: todos</option>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="admin-select">
              <option value="">Servicio: todos</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" placeholder="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="admin-input" />
            <input type="date" placeholder="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="admin-input" />
            <select value={limit} onChange={(e) => setLimit(e.target.value)} className="admin-select">
              <option value="10">10 resultados</option>
              <option value="20">20 resultados</option>
              <option value="50">50 resultados</option>
              <option value="100">100 resultados</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void applyFilters()} className="admin-btn admin-btn-primary">Aplicar Filtros</button>
            <button onClick={() => void clearFilters()} className="admin-btn">Limpiar</button>
          </div>
        </div>
      )}

      {loading ? (
        <AdminAppointmentsSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <svg className="h-8 w-8" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No hay citas</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Ajusta los filtros o espera nuevas reservas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <div key={item.id} className="admin-card flex flex-col sm:flex-row sm:items-center gap-6 group hover:border-[var(--accent-border)] transition-all">
                {/* Date badge */}
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl shadow-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)" }}>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                  </span>
                  <span className="text-2xl font-black text-[var(--accent)] leading-none mt-1">
                    {new Date(item.appointment_date + "T00:00").getDate()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {item.customer_name ?? "Cliente sin nombre"}
                    </p>
                    <span 
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
                      style={{ color: config.color, background: config.bg }}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path d={config.icon} />
                      </svg>
                      {config.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-5 text-sm flex-wrap" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-[var(--bg-secondary)]">
                        <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="font-bold">{item.start_time.slice(0, 5)}</span>
                    </div>
                    
                    {item.customer_phone && (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-[var(--bg-secondary)]">
                          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <span className="font-medium">{item.customer_phone}</span>
                      </div>
                    )}
                    
                    {item.notes && (
                      <div className="flex items-center gap-2 opacity-80">
                        <span className="text-base">📝</span>
                        <span className="italic truncate max-w-[200px]">{item.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status change */}
                <div className="relative shrink-0">
                  <select
                    value={item.status}
                    disabled={savingId === item.id}
                    onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                    className="admin-select !w-full sm:!w-44 !py-2.5 !px-4 text-sm font-bold border-2 transition-all cursor-pointer hover:border-[var(--accent)] focus:border-[var(--accent)] outline-none"
                    style={{ borderColor: config.color + "40" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                  {savingId === item.id && (
                    <div className="absolute inset-0 bg-[var(--bg-surface)]/60 flex items-center justify-center rounded-xl">
                      <div className="h-4 w-4 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
