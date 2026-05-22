/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { AdminAppointmentsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/admin-client-cache";

type Appointment = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  barber_id?: string;
  service_id?: string;
  branch_id?: string;
  barber?: { full_name: string } | null;
  service?: { name: string; price: number } | null;
  branch?: { name: string } | null;
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

// Notes extractor interface
interface ParsedNotes {
  payment: {
    method: string;
    tx: string;
    isPrepaid: boolean;
  } | null;
  companions: number | null;
  groupSlots: string[] | null;
  userNote: string | null;
}

// Notes parser helper
function parseAppointmentNotes(notesStr: string | null): ParsedNotes {
  if (!notesStr) {
    return { payment: null, companions: null, groupSlots: null, userNote: null };
  }

  let payment: ParsedNotes["payment"] = null;
  let companions: number | null = null;
  let groupSlots: string[] | null = null;
  const userNoteParts: string[] = [];

  const parts = notesStr.split(" | ");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[PAGO FICTICIO]") || trimmed.includes("metodo:") || trimmed.includes("tx:")) {
      const methodMatch = trimmed.match(/metodo:\s*([^\s|]+)/i);
      const txMatch = trimmed.match(/tx:\s*([^\s|]+)/i);
      const method = methodMatch ? methodMatch[1] : "QR/Tarjeta";
      const tx = txMatch ? txMatch[1] : "N/A";
      payment = {
        method,
        tx,
        isPrepaid: true,
      };
    } else if (trimmed.startsWith("Personas:")) {
      const match = trimmed.match(/Personas:\s*(\d+)/i);
      if (match) {
        companions = parseInt(match[1], 10);
      }
    } else if (trimmed.startsWith("Horarios del grupo:")) {
      const match = trimmed.match(/Horarios del grupo:\s*\[(.*?)\]/i);
      if (match) {
        groupSlots = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      }
    } else {
      userNoteParts.push(trimmed);
    }
  }

  // Fallback if no split by pipe but contains keywords
  if (!payment && (notesStr.includes("metodo:") || notesStr.includes("[PAGO FICTICIO]"))) {
    const methodMatch = notesStr.match(/metodo:\s*([^\s|]+)/i);
    const txMatch = notesStr.match(/tx:\s*([^\s|]+)/i);
    payment = {
      method: methodMatch ? methodMatch[1] : "Desconocido",
      tx: txMatch ? txMatch[1] : "N/A",
      isPrepaid: true,
    };
  }

  const userNote = userNoteParts.join(" | ");

  return { payment, companions, groupSlots, userNote: userNote || null };
}

// WhatsApp link generator helper
function getWhatsAppUrl(phone: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `https://wa.me/51${cleaned}`;
  }
  return `https://wa.me/${cleaned}`;
}

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
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Gestión de <span style={{ color: "var(--accent)" }}>Citas</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Monitorea y actualiza el estado de las citas en tiempo real. {items.length} {items.length === 1 ? "cita encontrada" : "citas encontradas"}
            </p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`admin-btn font-semibold flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              showFilters ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]" : ""
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          </button>
        </div>
      )}

      {showFilters && (
        <div className="admin-card space-y-4 animate-fade-in bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Filtros Avanzados
            </h3>
            <button 
              onClick={() => void clearFilters()} 
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Resetear filtros
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Sede</label>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                <option value="">Todos los estados</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Barbero</label>
              <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                <option value="">Todos los barberos</option>
                {barbers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Servicio</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                <option value="">Todos los servicios</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="admin-input !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="admin-input !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Límite</label>
              <select value={limit} onChange={(e) => setLimit(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                <option value="10">10 resultados</option>
                <option value="20">20 resultados</option>
                <option value="50">50 resultados</option>
                <option value="100">100 resultados</option>
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={() => void applyFilters()} className="admin-btn admin-btn-primary w-full justify-center !py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <AdminAppointmentsSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="admin-card p-16 text-center bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <svg className="h-10 w-10 text-[var(--accent)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>No se encontraron citas</h3>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Intenta cambiar los filtros de búsqueda o la sede seleccionada para visualizar otras reservas registradas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            const { payment, companions, groupSlots, userNote } = parseAppointmentNotes(item.notes);

            return (
              <div 
                key={item.id} 
                className="admin-card bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent-border)] transition-all duration-300 rounded-2xl p-5 shadow-lg group hover:-translate-y-0.5"
              >
                {/* Upper Row: Date, Branch & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {/* Date Badge */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-strong)" }}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
                        {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                      </span>
                      <span className="text-xl font-black leading-none mt-0.5 text-[var(--text-primary)]">
                        {new Date(item.appointment_date + "T00:00").getDate()}
                      </span>
                    </div>

                    <div>
                      {/* Branch Badge & Time */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.branch?.name && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                            📍 {item.branch.name}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[var(--text-muted)]">
                          ID: #{item.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {item.start_time.slice(0, 5)}
                        </span>
                        {groupSlots && groupSlots.length > 0 && (
                          <span className="text-xs text-[var(--text-secondary)] font-medium">
                            (Grupo: {groupSlots.join(", ")})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Status selector dropdown */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span 
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
                      style={{ color: config.color, background: config.bg }}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                      </svg>
                      {config.label}
                    </span>

                    <div className="relative">
                      <select
                        value={item.status}
                        disabled={savingId === item.id}
                        onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                        className="admin-select !py-1.5 !px-3 text-xs font-bold border rounded-lg transition-all cursor-pointer hover:border-[var(--accent)] focus:border-[var(--accent)] outline-none"
                        style={{ borderColor: config.color + "30", background: "var(--bg-secondary)" }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                      {savingId === item.id && (
                        <div className="absolute inset-0 bg-[var(--bg-surface)]/60 flex items-center justify-center rounded-lg">
                          <div className="h-3 w-3 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content: Info Columns */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Column 1: Customer Details */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Cliente
                    </h4>
                    <div className="space-y-2">
                      <p className="text-base font-bold text-[var(--text-primary)]">
                        {item.customer_name ?? "Cliente sin nombre"}
                      </p>
                      
                      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        {item.customer_email && (
                          <a 
                            href={`mailto:${item.customer_email}`}
                            className="flex items-center gap-2 hover:text-[var(--accent)] transition-colors py-0.5 group/link"
                          >
                            <svg className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover/link:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate max-w-[180px]">{item.customer_email}</span>
                          </a>
                        )}

                        {item.customer_phone && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {/* Call link */}
                            <a 
                              href={`tel:${item.customer_phone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all font-semibold"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Llamar
                            </a>
                            
                            {/* WhatsApp link */}
                            <a 
                              href={getWhatsAppUrl(item.customer_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 transition-all font-semibold"
                            >
                              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.167 1.451 4.777 1.453 5.378 0 9.754-4.374 9.758-9.754.002-2.605-1.013-5.056-2.86-6.905C16.417 2.097 13.961 1.08 11.36 1.08c-5.382 0-9.76 4.374-9.764 9.754-.002 1.709.452 3.376 1.312 4.868l-.963 3.517 3.606-.945zm11.367-7.793c-.302-.15-1.786-.881-2.062-.982-.277-.1-.478-.15-.679.15-.201.3-.778.982-.954 1.183-.176.201-.352.226-.654.076-.302-.15-1.275-.47-2.428-1.498-.897-.8-1.503-1.788-1.679-2.088-.176-.3-.019-.462.132-.612.135-.135.302-.35.452-.525.15-.175.201-.3.302-.5.101-.2.05-.375-.025-.525-.075-.15-.679-1.636-.93-2.246-.244-.589-.493-.51-.679-.519-.176-.009-.377-.01-.578-.01-.201 0-.527.075-.803.375-.276.3-1.055 1.031-1.055 2.516s1.08 2.917 1.23 3.117c.15.2 2.126 3.247 5.15 4.553.719.31 1.28.496 1.718.636.722.23 1.38.197 1.9.12.579-.087 1.786-.731 2.037-1.439.251-.708.251-1.313.176-1.439-.075-.125-.276-.201-.578-.351z"/>
                              </svg>
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Service & Barber Details */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Servicio y Barbero
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          💇‍♂️ {item.service?.name ?? "Servicio no especificado"}
                        </p>
                        {item.service?.price != null && (
                          <span className="inline-block mt-1 text-[11px] font-extrabold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-md px-2 py-0.5">
                            S/ {item.service.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 text-xs text-[var(--text-secondary)]">
                        <span className="text-base">💈</span>
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">
                            {item.barber?.full_name ?? "Cualquier barbero"}
                          </p>
                          <p className="text-[10px] uppercase font-black tracking-wider text-[var(--text-muted)]">
                            Especialista
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Companions & Payment Details */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Pago y Acompañantes
                    </h4>
                    <div className="space-y-2 text-xs">
                      {/* Companions indicator */}
                      {companions != null && companions > 0 ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                          <span className="text-base">👥</span>
                          <div>
                            <p className="font-bold text-[var(--text-primary)]">
                              Reserva Múltiple
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              +{companions} acompañante{companions > 1 ? "s" : ""} ({companions + 1} personas en total)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium italic text-[var(--text-muted)] pl-1">
                          Cita individual (Sin acompañantes)
                        </p>
                      )}

                      {/* Payment Badge */}
                      {payment ? (
                        <div className="pt-1">
                          <div className={`p-2 rounded-xl border flex flex-col gap-1.5 ${
                            payment.method.toLowerCase().includes("yape") || payment.method.toLowerCase().includes("plin") || payment.method.toLowerCase() === "qr"
                              ? "bg-[rgba(122,34,110,0.06)] text-[#d946ef] border-[rgba(122,34,110,0.18)]"
                              : payment.method.toLowerCase().includes("tarjeta") || payment.method.toLowerCase().includes("card")
                              ? "bg-blue-500/5 text-blue-400 border-blue-500/15"
                              : "bg-emerald-500/5 text-emerald-400 border-emerald-500/15"
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {payment.method.toLowerCase().includes("yape") || payment.method.toLowerCase().includes("plin") || payment.method.toLowerCase() === "qr"
                                  ? "📱"
                                  : payment.method.toLowerCase().includes("tarjeta") || payment.method.toLowerCase().includes("card")
                                  ? "💳"
                                  : "💵"}
                              </span>
                              <span className="font-extrabold uppercase text-[10px] tracking-wider">
                                Prepago: {payment.method}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono leading-none pl-5">
                              TX: <span className="text-[var(--text-secondary)] font-bold">{payment.tx}</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <div className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center gap-1.5">
                            <span className="text-sm">💵</span>
                            <span className="font-semibold text-[10px] tracking-wider uppercase">
                              Pago en Sede (Pendiente)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: User Notes */}
                {userNote && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 pl-1">
                      Nota del Cliente
                    </p>
                    <blockquote 
                      className="text-xs italic pl-3 border-l-2 py-0.5 rounded-r bg-[var(--bg-secondary)]/30"
                      style={{ borderLeftColor: "var(--accent)" }}
                    >
                      "{userNote}"
                    </blockquote>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
