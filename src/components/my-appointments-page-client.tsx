"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Footer } from "@/components/footer";
import { useToast } from "@/components/toast";

type MyAppointment = {
  id: string;
  customer_name: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  attendance_status: string;
  attendance_confirmed_at?: string | null;
  release_reason?: string | null;
  notes: string | null;
  created_at?: string | null;
  barber_id?: string | null;
  service_id?: string | null;
};

type WaitlistEntry = {
  id: string;
  branch_id: string;
  service_id: string;
  barber_id: string | null;
  desired_date: string;
  desired_start_from: string | null;
  desired_start_to: string | null;
  status: string;
  source_appointment_id?: string | null;
  promoted_appointment_id?: string | null;
  offer_expires_at?: string | null;
  notes: string | null;
  created_at?: string | null;
};

type CatalogService = {
  id: string;
  name: string;
  price: number;
  branch_id: string | null;
};

type CatalogBarber = {
  id: string;
  full_name: string;
};

type CatalogBranch = {
  id: string;
  name: string;
};

type FooterBranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

interface ParsedNotes {
  paymentState: "confirmed" | "processing" | null;
  method: string | null;
  tx: string | null;
  ref: string | null;
  amount: string | null;
  phone: string | null;
  cardLabel: string | null;
  card: string | null;
  personas: number | null;
  horarios: string[] | null;
  userNotes: string | null;
}

function parseNotes(notesStr: string | null): ParsedNotes {
  const result: ParsedNotes = {
    paymentState: null,
    method: null,
    tx: null,
    ref: null,
    amount: null,
    phone: null,
    cardLabel: null,
    card: null,
    personas: null,
    horarios: null,
    userNotes: null,
  };

  if (!notesStr) return result;

  if (!notesStr.includes("|") && !notesStr.includes("metodo:")) {
    result.userNotes = notesStr;
    return result;
  }

  const parts = notesStr.split("|").map((part) => part.trim());
  for (const part of parts) {
    if (part.includes("[PAGO FICTICIO]") || part.includes("[PAGO CULQI]")) {
      result.paymentState = "confirmed";
    } else if (part.includes("[PAGO CULQI EN PROCESO]")) {
      result.paymentState = "processing";
    }

    if (
      part.includes("[PAGO FICTICIO]") ||
      part.includes("[PAGO CULQI]") ||
      part.includes("[PAGO CULQI EN PROCESO]")
    ) {
      result.method = part.match(/metodo:(\S+)/)?.[1] ?? result.method;
      result.method = result.method ?? part.match(/canal:(\S+)/)?.[1] ?? null;
      result.tx = part.match(/tx:(\S+)/)?.[1] ?? result.tx;
      result.ref = part.match(/ref:(\S+)/)?.[1] ?? result.ref;
      result.amount = part.match(/monto:(\S+)/)?.[1] ?? result.amount;
      result.phone = part.match(/celular:(\S+)/)?.[1] ?? result.phone;
      result.cardLabel = part.match(/tarjeta:(\S+)/)?.[1] ?? result.cardLabel;
      result.card = part.match(/card:(\S+)/)?.[1] ?? result.card;
      continue;
    }

    if (part.startsWith("Personas:")) {
      result.personas = Number(part.match(/Personas:(\d+)/)?.[1] ?? "0") || null;
      continue;
    }

    if (part.startsWith("Horarios del grupo:")) {
      const match = part.match(/Horarios del grupo:\s*\[(.*?)\]/);
      if (match) {
        result.horarios = match[1].split(",").map((h) => h.trim()).filter(Boolean);
      }
      continue;
    }

    if (part) {
      result.userNotes = result.userNotes ? `${result.userNotes} | ${part}` : part;
    }
  }

  return result;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  confirmed: { label: "Confirmada", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  in_progress: { label: "En progreso", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  completed: { label: "Completada", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  cancelled: { label: "Cancelada", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  no_show: { label: "No asistió", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
};

const attendanceConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pendiente de confirmar asistencia", tone: "text-amber-300" },
  confirmed: { label: "Asistencia confirmada", tone: "text-emerald-300" },
  declined: { label: "Asistencia rechazada", tone: "text-rose-300" },
  expired: { label: "Confirmación expirada", tone: "text-slate-300" },
};

const waitlistStatusConfig: Record<string, { label: string; tone: string; bg: string }> = {
  active: { label: "En espera", tone: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  offered: { label: "Cupo ofertado", tone: "text-sky-300", bg: "bg-sky-500/10 border-sky-500/20" },
  accepted: { label: "Aceptada", tone: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Rechazada", tone: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
  expired: { label: "Expirada", tone: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  fulfilled: { label: "Convertida en cita", tone: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  cancelled: { label: "Cancelada", tone: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
};

function isFutureAppointment(appointmentDate: string, startTime: string) {
  const [year, month, day] = appointmentDate.split("-").map(Number);
  const [hours, minutes] = startTime.slice(0, 5).split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime() > Date.now();
}

function formatDesiredWindow(entry: WaitlistEntry) {
  if (entry.desired_start_from && entry.desired_start_to) {
    return `${entry.desired_start_from} - ${entry.desired_start_to}`;
  }
  if (entry.desired_start_from) return `Desde ${entry.desired_start_from}`;
  if (entry.desired_start_to) return `Hasta ${entry.desired_start_to}`;
  return "Cualquier horario disponible";
}

export default function MyAppointmentsPageClient({
  initialItems,
  initialServices,
  initialBarbers,
  initialBranches,
  initialWaitlistEntries,
  footerBranchContact,
  initialError,
}: {
  initialItems: MyAppointment[];
  initialServices: CatalogService[];
  initialBarbers: CatalogBarber[];
  initialBranches: CatalogBranch[];
  initialWaitlistEntries: WaitlistEntry[];
  footerBranchContact?: FooterBranchContact | null;
  initialError: string | null;
}) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MyAppointment[]>(initialItems);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(initialWaitlistEntries);
  const [error] = useState<string | null>(initialError);
  const [services] = useState<CatalogService[]>(initialServices);
  const [barbers] = useState<CatalogBarber[]>(initialBarbers);
  const [branches] = useState<CatalogBranch[]>(initialBranches);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appointmentActionId, setAppointmentActionId] = useState<string | null>(null);
  const [waitlistActionId, setWaitlistActionId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      toast("Tu cita fue registrada y ya aparece en tu historial.");
    }
  }, [searchParams, toast]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (createdA !== createdB) return createdB - createdA;

      const dateA = new Date(`${a.appointment_date}T${a.start_time.slice(0, 5)}:00`).getTime();
      const dateB = new Date(`${b.appointment_date}T${b.start_time.slice(0, 5)}:00`).getTime();
      return dateB - dateA;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const parsed = parseNotes(item.notes);
      const effectiveStatus =
        item.status === "pending" && parsed.paymentState === "confirmed" ? "confirmed" : item.status;

      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
      if (dateFrom && item.appointment_date < dateFrom) return false;
      if (dateTo && item.appointment_date > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo, sortedItems, statusFilter]);

  const statusCounts = useMemo(() => {
    return sortedItems.reduce<Record<string, number>>((acc, item) => {
      const parsed = parseNotes(item.notes);
      const effectiveStatus =
        item.status === "pending" && parsed.paymentState === "confirmed" ? "confirmed" : item.status;
      acc[effectiveStatus] = (acc[effectiveStatus] ?? 0) + 1;
      return acc;
    }, {});
  }, [sortedItems]);

  const handleAppointmentAction = useCallback(
    async (id: string, action: "confirm_attendance" | "decline_attendance") => {
      setAppointmentActionId(id);
      try {
        const res = await fetch(`/api/my/appointments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          item?: MyAppointment;
          error?: string;
        };

        if (!res.ok || !json.item) {
          toast(json.error ?? "No se pudo actualizar la asistencia.", "error");
          return;
        }

        setItems((current) => current.map((item) => (item.id === id ? json.item! : item)));
        toast(
          action === "confirm_attendance"
            ? "Tu asistencia fue confirmada."
            : "La cita fue liberada correctamente.",
        );
      } finally {
        setAppointmentActionId(null);
      }
    },
    [toast],
  );

  const handleWaitlistAction = useCallback(
    async (id: string, action: "accept" | "reject" | "cancel") => {
      setWaitlistActionId(id);
      try {
        const res = await fetch(`/api/my/waitlist/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const json = (await res.json().catch(() => ({}))) as {
          item?: WaitlistEntry;
          appointment?: MyAppointment | null;
          error?: string;
        };

        if (!res.ok || !json.item) {
          toast(json.error ?? "No se pudo actualizar la lista de espera.", "error");
          return;
        }

        setWaitlistEntries((current) => current.map((entry) => (entry.id === id ? json.item! : entry)));

        if (json.appointment) {
          setItems((current) => [json.appointment!, ...current]);
        }

        const actionMessages: Record<typeof action, string> = {
          accept: "El cupo fue aceptado y se convirtió en una nueva cita.",
          reject: "La oferta fue rechazada.",
          cancel: "Tu solicitud de lista de espera fue cancelada.",
        };
        toast(actionMessages[action]);
      } finally {
        setWaitlistActionId(null);
      }
    },
    [toast],
  );

  return (
    <>
      <main className="flex-1 pt-28 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10">
            <span className="section-label">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Historial
            </span>
            <h1 className="mt-4 text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Mis <span className="text-[var(--accent)]">Citas</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Revisa tus reservas, confirma tu asistencia y gestiona tus cupos en espera.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          {items.length === 0 && waitlistEntries.length === 0 && !error ? (
            <div className="glass-card p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
                <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Aún no tienes actividad registrada</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Reserva tu primera cita o únete a una lista de espera para empezar.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/reservar" className="btn-gold inline-flex">Reservar ahora</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="glass-card h-fit border border-white/5 p-4 sm:p-5 lg:sticky lg:top-28">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Filtros</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Organiza tu actividad</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Estado</p>
                    <div className="mt-3 space-y-2">
                      {[
                        { key: "all", label: "Todas", count: sortedItems.length, tone: "text-white" },
                        { key: "confirmed", label: "Confirmadas", count: statusCounts.confirmed ?? 0, tone: "text-blue-400" },
                        { key: "in_progress", label: "En atención", count: statusCounts.in_progress ?? 0, tone: "text-purple-400" },
                        { key: "completed", label: "Completadas", count: statusCounts.completed ?? 0, tone: "text-green-400" },
                        { key: "cancelled", label: "Canceladas", count: statusCounts.cancelled ?? 0, tone: "text-red-400" },
                        { key: "no_show", label: "No asistí", count: statusCounts.no_show ?? 0, tone: "text-slate-300" },
                      ].map((filterItem) => (
                        <button
                          key={filterItem.key}
                          type="button"
                          onClick={() => setStatusFilter(filterItem.key)}
                          className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${
                            statusFilter === filterItem.key
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-sm"
                              : "border-white/5 bg-white/[0.02] hover:border-[var(--accent-border)]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`text-sm font-semibold ${statusFilter === filterItem.key ? "text-[var(--accent)]" : filterItem.tone}`}>
                              {filterItem.label}
                            </span>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">
                              {filterItem.count}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Rango de fechas</p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Desde</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#14141d]/80 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--accent-border)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Hasta</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#14141d]/80 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--accent-border)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="space-y-5">
                {waitlistEntries.length > 0 && (
                  <section className="glass-card border border-sky-500/10 p-5 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Lista de espera</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Solicitudes activas y ofertas pendientes</h2>
                      </div>
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                        {waitlistEntries.length} {waitlistEntries.length === 1 ? "solicitud" : "solicitudes"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {waitlistEntries.map((entry) => {
                        const service = services.find((item) => item.id === entry.service_id);
                        const barber = entry.barber_id ? barbers.find((item) => item.id === entry.barber_id) : null;
                        const branch = service ? branches.find((item) => item.id === service.branch_id) : null;
                        const status = waitlistStatusConfig[entry.status] ?? waitlistStatusConfig.active;
                        const isOffered = entry.status === "offered";

                        return (
                          <div key={entry.id} className="rounded-2xl border border-white/5 bg-[#14141d]/40 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">{service?.name ?? "Servicio en espera"}</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {branch?.name ?? "Sede pendiente"} · {barber?.full_name ?? "Cualquier barbero"}
                                </p>
                                <p className="mt-2 text-xs text-[var(--text-muted)]">
                                  Fecha deseada: <span className="text-white">{entry.desired_date}</span> · Ventana:{" "}
                                  <span className="text-white">{formatDesiredWindow(entry)}</span>
                                </p>
                                {entry.offer_expires_at && isOffered && (
                                  <p className="mt-2 text-xs text-amber-300">
                                    La oferta vence: {new Date(entry.offer_expires_at).toLocaleString("es-PE")}
                                  </p>
                                )}
                              </div>
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.bg} ${status.tone}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {status.label}
                              </span>
                            </div>

                            {entry.notes && (
                              <p className="mt-3 text-xs italic text-[var(--text-secondary)]">{entry.notes}</p>
                            )}

                            {(entry.status === "active" || entry.status === "offered") && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {entry.status === "offered" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void handleWaitlistAction(entry.id, "accept")}
                                      disabled={waitlistActionId === entry.id}
                                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-60"
                                    >
                                      {waitlistActionId === entry.id ? "Procesando..." : "Aceptar cupo"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleWaitlistAction(entry.id, "reject")}
                                      disabled={waitlistActionId === entry.id}
                                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-60"
                                    >
                                      Rechazar oferta
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleWaitlistAction(entry.id, "cancel")}
                                  disabled={waitlistActionId === entry.id}
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-white/20 hover:text-white disabled:opacity-60"
                                >
                                  Cancelar solicitud
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {filteredItems.length} {filteredItems.length === 1 ? "reserva visible" : "reservas visibles"}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Ordenadas por registro reciente
                  </p>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="glass-card p-10 text-center">
                    <h3 className="text-lg font-semibold">No hay citas con esos filtros</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Ajusta el estado o el rango de fechas para ver otras reservas.
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const parsed = parseNotes(item.notes);
                    const effectiveStatus =
                      item.status === "pending" && parsed.paymentState === "confirmed" ? "confirmed" : item.status;
                    const st = statusConfig[effectiveStatus] ?? statusConfig.pending;
                    const service = services.find((s) => s.id === item.service_id);
                    const barber = barbers.find((b) => b.id === item.barber_id);
                    const branch = service ? branches.find((br) => br.id === service.branch_id) : null;
                    const attendance = attendanceConfig[item.attendance_status] ?? attendanceConfig.pending;
                    const canManageAttendance =
                      ["pending", "confirmed"].includes(item.status) &&
                      item.attendance_status === "pending" &&
                      isFutureAppointment(item.appointment_date, item.start_time);

                    return (
                      <div
                        key={item.id}
                        className="glass-card relative overflow-hidden border border-white/5 p-5 shadow-md transition-all duration-300 hover:border-[var(--accent-border)]/40 sm:p-6"
                      >
                        <div className="absolute left-0 top-0 h-[2.5px] w-full bg-gradient-to-r from-[var(--accent)] to-amber-500 opacity-70" />

                        <div className="flex flex-col gap-5 md:flex-row md:items-center">
                          <div className="flex shrink-0 items-center justify-between rounded-2xl border border-white/5 bg-[#14141d]/80 p-3 transition-all duration-300 md:h-20 md:w-20 md:flex-col md:justify-center">
                            <div className="flex items-center gap-2 md:flex-col md:gap-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                {new Date(`${item.appointment_date}T00:00`).toLocaleDateString("es", { month: "short" })}
                              </span>
                              <span className="text-2xl font-black leading-none text-[var(--accent)]">
                                {new Date(`${item.appointment_date}T00:00`).getDate()}
                              </span>
                            </div>
                            <span className="hidden text-[10px] font-semibold text-[var(--text-muted)] md:block">
                              {new Date(`${item.appointment_date}T00:00`).getFullYear()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-bold leading-tight text-white sm:text-lg">
                                  {service?.name ?? "Servicio de barbería"}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-secondary)]">
                                  <span className="flex items-center gap-1">
                                    <svg className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Con {barber?.full_name ?? "Barbero asignado"}
                                  </span>
                                  <span className="hidden text-white/10 sm:inline">•</span>
                                  <span>Sede {branch?.name ?? "Filo Estilo"}</span>
                                </div>
                              </div>

                              {service && (
                                <span className="shrink-0 rounded-xl border border-[var(--accent-border)]/30 bg-[var(--accent-soft)]/20 px-3 py-1 text-sm font-bold text-[var(--accent)]">
                                  S/. {service.price.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                                <svg className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                Hora: <span className="font-bold text-[var(--accent)]">{item.start_time.slice(0, 5)}</span>
                              </span>
                              <span className={`inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium ${attendance.tone}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {attendance.label}
                              </span>
                              {item.release_reason && (
                                <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">
                                  Motivo: {item.release_reason}
                                </span>
                              )}
                            </div>

                            {(parsed.paymentState || parsed.personas || parsed.userNotes) && (
                              <div className="space-y-3 rounded-2xl border border-white/5 bg-[#14141d]/40 p-3 sm:p-4">
                                {parsed.paymentState && (
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    {parsed.method === "TARJETA" && (
                                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shadow-sm">
                                        <Image src="/visa.svg" alt="Tarjeta" width={18} height={12} className="h-3 w-[18px] object-contain" />
                                        Tarjeta {parsed.cardLabel ?? `**** ${parsed.card ?? "4242"}`}
                                      </span>
                                    )}
                                    {parsed.method === "YAPE" && (
                                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-300 shadow-sm">
                                        <Image src="/yape.svg" alt="Yape" width={16} height={16} className="h-4 w-4" />
                                        Yape
                                      </span>
                                    )}
                                    {parsed.method === "EFECTIVO" && (
                                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 shadow-sm">
                                        Pago simulado en local
                                      </span>
                                    )}
                                    {parsed.tx && <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">ID: {parsed.tx}</span>}
                                    {!parsed.tx && parsed.ref && <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">REF: {parsed.ref}</span>}
                                    {parsed.amount && <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">Monto: S/ {parsed.amount}</span>}
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${parsed.paymentState === "confirmed" ? "text-emerald-400/80" : "text-amber-500/70"}`}>
                                      {parsed.paymentState === "confirmed" ? "Pago confirmado" : "Pago en validación"}
                                    </span>
                                  </div>
                                )}

                                {parsed.personas && parsed.personas > 1 && (
                                  <div className="border-t border-white/5 pt-2.5">
                                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent)]">
                                      Reserva grupal ({parsed.personas} personas)
                                    </p>
                                    {parsed.horarios && parsed.horarios.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-medium text-[var(--text-muted)]">Horarios:</span>
                                        {parsed.horarios.map((slotTime, index) => (
                                          <span
                                            key={`${item.id}-${slotTime}-${index}`}
                                            className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                              slotTime.slice(0, 5) === item.start_time.slice(0, 5)
                                                ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                                                : "border border-white/5 bg-white/5 text-[var(--text-muted)]"
                                            }`}
                                          >
                                            {slotTime.slice(0, 5)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {parsed.userNotes && (
                                  <div className="flex items-start gap-2 border-t border-white/5 pt-2.5">
                                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nota del cliente</p>
                                      <p className="mt-0.5 text-xs italic leading-relaxed text-[var(--text-secondary)]">
                                        &quot;{parsed.userNotes}&quot;
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {canManageAttendance && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => void handleAppointmentAction(item.id, "confirm_attendance")}
                                  disabled={appointmentActionId === item.id}
                                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-60"
                                >
                                  {appointmentActionId === item.id ? "Procesando..." : "Confirmar asistencia"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleAppointmentAction(item.id, "decline_attendance")}
                                  disabled={appointmentActionId === item.id}
                                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-60"
                                >
                                  No podré asistir
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/5 pt-3 md:flex-col md:items-end md:justify-center md:border-t-0 md:pt-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${st.bg} ${st.color}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                              {st.label}
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                              Ref: #{item.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer initialBranchContact={footerBranchContact ?? null} />
    </>
  );
}
