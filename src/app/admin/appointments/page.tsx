"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { AdminAppointmentsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";

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
  barber?: { full_name: string; image_url?: string | null } | null;
  service?: { name: string; price: number; image_url?: string | null } | null;
  branch?: { name: string } | null;
};

type OptionItem = { id: string; full_name?: string; name?: string };
type Branch = { id: string; name: string };

const STATUSES: Appointment["status"][] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

const STATUS_CONFIG_SIMPLE: Record<Appointment["status"], { label: string }> = {
  pending: { label: "Pendiente" },
  confirmed: { label: "Confirmada" },
  in_progress: { label: "En progreso" },
  completed: { label: "Completada" },
  cancelled: { label: "Cancelada" },
  no_show: { label: "No asistió" },
};

const getDetailedStatusConfig = (status: Appointment["status"], isPrepaid: boolean) => {
  if (status === "pending") {
    if (isPrepaid) {
      return {
        label: "Pagado y Confirmado",
        color: "#10b981", // este es colorcito esmeralda porseaca
        bg: "rgba(16, 185, 129, 0.1)",
        border: "rgba(16, 185, 129, 0.2)",
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    } else {
      return {
        label: "Pendiente (Pago en Local)",
        color: "#f59e0b", // color amber de brawl
        bg: "rgba(245, 158, 11, 0.1)",
        border: "rgba(245, 158, 11, 0.2)",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    }
  }

  switch (status) {
    case "confirmed":
      return {
        label: "Confirmado",
        color: "#3b82f6", // blue oceano
        bg: "rgba(59, 130, 246, 0.1)",
        border: "rgba(59, 130, 246, 0.2)",
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    case "in_progress":
      return {
        label: "En Atención",
        color: "#a855f7", // moradito 
        bg: "rgba(168, 85, 247, 0.1)",
        border: "rgba(168, 85, 247, 0.2)",
        icon: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      };
    case "completed":
      return {
        label: "Finalizado",
        color: "#22c55e", // verdecito
        bg: "rgba(34, 197, 94, 0.1)",
        border: "rgba(34, 197, 94, 0.2)",
        icon: "M5 13l4 4L19 7"
      };
    case "cancelled":
      return {
        label: "Cancelado",
        color: "#ef4444", // rojito
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.2)",
        icon: "M6 18L18 6M6 6l12 12"
      };
    case "no_show":
      return {
        label: "No Asistió",
        color: "#9ca3af", // gray o gris
        bg: "rgba(156, 163, 175, 0.1)",
        border: "rgba(156, 163, 175, 0.2)",
        icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      };
  }
};

const getStepStatus = (step: number, status: Appointment["status"]): "completed" | "active" | "upcoming" => {
  const statusOrder: Record<Appointment["status"], number> = {
    pending: 1,
    confirmed: 2,
    in_progress: 3,
    completed: 4,
    cancelled: 0,
    no_show: 0,
  };

  const currentOrder = statusOrder[status] || 0;
  if (currentOrder === 0) return "upcoming";

  if (step < currentOrder) return "completed";
  if (step === currentOrder) return "active";
  return "upcoming";
};

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
      
      if (/reserva automatizada bdd/i.test(trimmed)) continue;
      userNoteParts.push(trimmed);
    }
  }

  
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
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
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
    try {
      const barbersUrl = branchFilter ? `/api/admin/barbers?branch_id=${branchFilter}` : `/api/admin/barbers`;
      const servicesUrl = branchFilter ? `/api/admin/services?branch_id=${branchFilter}` : `/api/admin/services`;
      const [bJson, sJson] = await Promise.all([
        fetchCachedJson<{ items?: OptionItem[] }>(barbersUrl, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: OptionItem[] }>(servicesUrl, { ttlMs: 20_000 }),
      ]);
      setBarbers(bJson.items ?? []);
      setServices(sJson.items ?? []);
    } catch {
      
    }
  }

  async function load() {
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
        const selected = (remembered !== null && (remembered === "" || nextBranches.some((b) => b.id === remembered))) 
          ? remembered 
          : nextBranches[0]?.id || "";
        setBranches(nextBranches);
        setBranchFilter(selected);
      } finally {
        setBranchesLoading(false);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    if (branchFilter !== undefined) {
      void loadOptions();
      void load();
    }
  }, [branchFilter]);

  useEffect(() => {
    if (branchFilter !== undefined) {
      localStorage.setItem("admin.branch_id", branchFilter);
    }
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
    
    // Immediate local update
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    
    const notesParsed = parseAppointmentNotes(items.find(item => item.id === id)?.notes || "");
    const config = getDetailedStatusConfig(status, !!notesParsed.payment?.isPrepaid);
    toast(`Cita marcada como ${config.label}`);
  }

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
        <div className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
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

          {/* Sede tabs premium */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              <button
                onClick={() => setBranchFilter("")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                  branchFilter === ""
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-md"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-white/[0.02]"
                }`}
              >
                🌍 Todas las Sedes
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchFilter(b.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                    branchFilter === b.id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-md"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-white/[0.02]"
                  }`}
                >
                  📍 {b.name}
                </button>
              ))}
            </div>
          )}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                <option value="">Todos los estados</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG_SIMPLE[s].label}</option>)}
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

            <div className="grid grid-cols-2 gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>Límite</label>
                <select value={limit} onChange={(e) => setLimit(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                  <option value="10">10 resultados</option>
                  <option value="20">20 resultados</option>
                  <option value="50">50 resultados</option>
                  <option value="100">100 resultados</option>
                </select>
              </div>
              <button onClick={() => void applyFilters()} className="admin-btn admin-btn-primary w-full justify-center !py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all">
                Filtrar
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
            const { payment, companions, groupSlots, userNote } = parseAppointmentNotes(item.notes);
            const isPrepaid = !!payment?.isPrepaid;
            const config = getDetailedStatusConfig(item.status, isPrepaid);

            return (
              <div 
                key={item.id} 
                className="admin-card bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent-border)]/50 transition-all duration-300 rounded-2xl p-5 shadow-lg group hover:-translate-y-0.5"
              >
                {/* Upper Row: Date, Branch, Stepper & Status Selector */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {/* Date Badge */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-strong)" }}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
                        {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                      </span>
                      <span className="text-xl font-black leading-none mt-0.5 text-[var(--text-primary)] font-mono">
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
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          ID: #{item.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                          {item.start_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper & Dropdown selector */}
                  <div className="flex flex-wrap items-center gap-3 self-end xl:self-center">
                    {/* Stepper component */}
                    {item.status !== "cancelled" && item.status !== "no_show" && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold py-1.5 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden shrink-0">
                        {[
                          { num: 1, label: isPrepaid ? "Pagado" : "Registrado" },
                          { num: 2, label: "Confirmado" },
                          { num: 3, label: "En Atención" },
                          { num: 4, label: "Finalizado" }
                        ].map((step, idx) => {
                          const stepState = getStepStatus(step.num, item.status);
                          return (
                            <div key={step.num} className="flex items-center gap-1.5 sm:gap-2">
                              {idx > 0 && (
                                <div className={`h-[2px] w-2 sm:w-4 transition-all duration-300 ${
                                  stepState === "completed" || stepState === "active" ? "bg-[var(--accent)]" : "bg-white/10"
                                }`} />
                              )}
                              <div className="flex items-center gap-1">
                                <span className={`flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black transition-all ${
                                  stepState === "completed"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    : stepState === "active"
                                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] animate-pulse"
                                    : "bg-white/5 text-[var(--text-muted)] border border-white/5"
                                }`}>
                                  {stepState === "completed" ? "✓" : step.num}
                                </span>
                                <span className={`hidden md:inline text-[9px] sm:text-[10px] ${
                                  stepState === "completed" ? "text-emerald-400" : stepState === "active" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Exceptions (Cancelled or No Show) banner */}
                    {(item.status === "cancelled" || item.status === "no_show") && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider" style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}20` }}>
                        ⚠️ Cita {config.label}
                      </span>
                    )}

                    {/* Status badge pill and dropdown */}
                    <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl py-1 px-2.5 shadow-sm">
                      <span 
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                        style={{ color: config.color, background: config.bg }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {config.label}
                      </span>

                      <div className="relative">
                        <select
                          value={item.status}
                          disabled={savingId === item.id}
                          onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                          className="admin-select !py-1 !pl-2 !pr-6 text-[10px] sm:text-xs font-bold border rounded-lg transition-all cursor-pointer hover:border-[var(--accent)] focus:border-[var(--accent)] outline-none !bg-transparent border-transparent"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                              {s === "pending" ? (isPrepaid ? "Pagado y Confirmado" : "Pendiente") : STATUS_CONFIG_SIMPLE[s].label}
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
                </div>

                {/* Main Content: Info Columns */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Column 1: Customer Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all font-semibold text-[10px] sm:text-xs"
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 transition-all font-semibold text-[10px] sm:text-xs"
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

                  {/* Column 2: Service & Barber Details with images */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Servicio y Barbero
                    </h4>
                    <div className="space-y-3">
                      {/* Service block with thumbnail */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 rounded-xl border border-white/10 overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center shadow-md">
                          {item.service?.image_url ? (
                            <Image
                              src={item.service.image_url} 
                              alt={item.service.name} 
                              fill
                              sizes="48px"
                              className="object-cover" 
                            />
                          ) : (
                            <span className="text-sm font-black text-[var(--accent)] font-serif">
                              {item.service?.name ? item.service.name.charAt(0).toUpperCase() : "S"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                            {item.service?.name ?? "Servicio no especificado"}
                          </p>
                          {item.service?.price != null && (
                            <span className="inline-block mt-1 text-[11px] font-black font-mono text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-border)]/30 rounded-md px-2 py-0.5">
                              S/ {item.service.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Barber block with avatar */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="relative h-10 w-10 shrink-0 rounded-full border border-[var(--accent-border)]/40 overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center shadow-inner">
                          {item.barber?.image_url ? (
                            <Image
                              src={item.barber.image_url} 
                              alt={item.barber.full_name} 
                              fill
                              sizes="40px"
                              className="object-cover" 
                            />
                          ) : (
                            <span className="text-xs font-black text-[var(--accent)]">
                              {item.barber?.full_name ? item.barber.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "B"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-none">
                            {item.barber?.full_name ?? "Cualquier barbero"}
                          </p>
                          <p className="text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] mt-1.5">
                            Barbero Especialista
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Companions & Payment Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Pago y Acompañantes
                    </h4>
                    <div className="space-y-3 text-xs">
                      {/* Companions indicator */}
                      {companions != null && companions > 0 ? (
                        <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                              👥 Reserva Grupal
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                              {companions + 1} personas
                            </span>
                          </div>
                          
                          {/* Superimposed avatar group layout */}
                          <div className="flex items-center -space-x-2 overflow-hidden py-1 pl-1">
                            {Array.from({ length: Math.min(companions + 1, 5) }).map((_, aIdx) => (
                              <div 
                                key={aIdx} 
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-[var(--bg-surface)] bg-gradient-to-tr from-amber-500/10 to-amber-600/30 border border-[var(--accent-border)]/15 flex items-center justify-center text-[9px] font-black text-[var(--accent)] shadow-sm"
                              >
                                {aIdx === 0 ? "Tit" : `A${aIdx}`}
                              </div>
                            ))}
                            {companions + 1 > 5 && (
                              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[var(--bg-surface)] bg-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold text-[var(--text-secondary)] shadow-sm">
                                +{companions + 1 - 5}
                              </div>
                            )}
                          </div>

                          {groupSlots && groupSlots.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center pt-1.5 border-t border-[var(--border)]">
                              {groupSlots.map((slotTime, sIdx) => {
                                const isCurrent = slotTime.slice(0, 5) === item.start_time.slice(0, 5);
                                return (
                                  <span 
                                    key={sIdx} 
                                    className={`rounded-lg px-2 py-0.5 text-[9px] font-bold font-mono ${
                                      isCurrent 
                                        ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm" 
                                        : "bg-white/5 text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {slotTime.slice(0, 5)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-[var(--border)] bg-white/[0.01]">
                          <span className="text-sm">👤</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Reserva Individual
                          </span>
                        </div>
                      )}

                      {/* Payment Badge */}
                      {payment ? (
                        <div className="pt-1">
                          <div className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
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
                              <span className="font-black uppercase text-[10px] tracking-wider">
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
                          <div className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="text-sm">💵</span>
                            <span className="font-bold text-[10px] tracking-wider uppercase">
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
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5 pl-1">
                      Nota del Cliente
                    </p>
                    <blockquote 
                      className="text-xs italic pl-3 border-l-2 py-1 rounded-r bg-[var(--bg-secondary)]/20"
                      style={{ borderLeftColor: "var(--accent)" }}
                    >
                      &quot;{userNote}&quot;
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
