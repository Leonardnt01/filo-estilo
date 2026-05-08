/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string; customer_name: string | null; customer_phone: string | null;
  appointment_date: string; start_time: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string | null; barber_id?: string; service_id?: string;
};

type OptionItem = { id: string; full_name?: string; name?: string };

const STATUSES: Appointment["status"][] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmada", in_progress: "En progreso",
  completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};

export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<OptionItem[]>([]);
  const [services, setServices] = useState<OptionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  async function loadOptions() {
    const [bRes, sRes] = await Promise.all([fetch("/api/admin/barbers"), fetch("/api/admin/services")]);
    const bJson = await bRes.json().catch(() => ({}));
    const sJson = await sRes.json().catch(() => ({}));
    if (bRes.ok) setBarbers(bJson.items ?? []);
    if (sRes.ok) setServices(sJson.items ?? []);
  }

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (barberFilter) params.set("barber_id", barberFilter);
    if (serviceFilter) params.set("service_id", serviceFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (limit) params.set("limit", limit);
    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "No se pudo cargar citas"); return; }
    setItems(json.items ?? []);
  }

  useEffect(() => { void loadOptions(); void load(); }, []);

  async function applyFilters() { setError(null); setSuccess(null); await load(); }
  async function clearFilters() {
    setStatusFilter(""); setBarberFilter(""); setServiceFilter("");
    setDateFrom(""); setDateTo(""); setLimit("20");
    setError(null); setSuccess(null);
    setTimeout(() => { void load(); }, 0);
  }

  async function changeStatus(id: string, status: Appointment["status"]) {
    setSavingId(id);
    const res = await fetch(`/api/admin/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSavingId(null);
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo cambiar estado"); return; }
    setSuccess("Estado actualizado"); await load();
  }

  return (
    <section className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
      {showFilters && (
        <div className="admin-card space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Filtros de búsqueda</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select">
              <option value="">Estado: todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
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

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Appointments as cards on mobile, table on desktop */}
      {items.length === 0 ? (
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
          {items.map((item) => (
            <div key={item.id} className="admin-card flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Date badge */}
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
                <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                  {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                </span>
                <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                  {new Date(item.appointment_date + "T00:00").getDate()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {item.customer_name ?? "Cliente sin nombre"}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium status-${item.status}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {item.start_time}
                  </span>
                  {item.customer_phone && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {item.customer_phone}
                    </span>
                  )}
                  {item.notes && <span className="truncate max-w-[200px]">📝 {item.notes}</span>}
                </div>
              </div>

              {/* Status change */}
              <select
                value={item.status}
                disabled={savingId === item.id}
                onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                className="admin-select !w-auto shrink-0 disabled:opacity-50"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
