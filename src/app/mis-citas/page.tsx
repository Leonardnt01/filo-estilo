/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useToast } from "@/components/toast";

type MyAppointment = {
  id: string;
  customer_name: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  barber_id?: string | null;
  service_id?: string | null;
};

interface ParsedNotes {
  isPagoFicticio: boolean;
  method: string | null;
  tx: string | null;
  card: string | null;
  personas: number | null;
  horarios: string[] | null;
  userNotes: string | null;
}

function parseNotes(notesStr: string | null): ParsedNotes {
  const result: ParsedNotes = {
    isPagoFicticio: false,
    method: null,
    tx: null,
    card: null,
    personas: null,
    horarios: null,
    userNotes: null,
  };

  if (!notesStr) return result;

  // Si no sigue el formato estructurado
  if (!notesStr.includes("|") && !notesStr.includes("metodo:")) {
    result.userNotes = notesStr;
    return result;
  }

  const parts = notesStr.split("|").map((p) => p.trim());

  for (const part of parts) {
    if (part.includes("[PAGO FICTICIO]")) {
      result.isPagoFicticio = true;
      
      const methodMatch = part.match(/metodo:(\S+)/);
      if (methodMatch) result.method = methodMatch[1];

      const txMatch = part.match(/tx:(\S+)/);
      if (txMatch) result.tx = txMatch[1];

      const cardMatch = part.match(/card:(\S+)/);
      if (cardMatch) result.card = cardMatch[1];
    } else if (part.startsWith("Personas:")) {
      const pMatch = part.match(/Personas:(\d+)/);
      if (pMatch) result.personas = parseInt(pMatch[1], 10);
    } else if (part.startsWith("Horarios del grupo:")) {
      const hMatch = part.match(/Horarios del grupo:\s*\[(.*?)\]/);
      if (hMatch) {
        result.horarios = hMatch[1].split(",").map((h) => h.trim()).filter(Boolean);
      }
    } else {
      if (part) {
        if (result.userNotes) {
          result.userNotes += ` | ${part}`;
        } else {
          result.userNotes = part;
        }
      }
    }
  }

  return result;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pendiente",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  confirmed:   { label: "Confirmada",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  in_progress: { label: "En progreso", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  completed:   { label: "Completada",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  cancelled:   { label: "Cancelada",   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  no_show:     { label: "No asistió",  color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};

function MyAppointmentsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MyAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  async function load() {
    try {
      const [appointmentsRes, catalogRes] = await Promise.all([
        fetch("/api/my/appointments"),
        fetch("/api/booking/catalog"),
      ]);

      const appointmentsJson = await appointmentsRes.json().catch(() => ({}));
      const catalogJson = await catalogRes.json().catch(() => ({}));

      if (!appointmentsRes.ok) {
        setError(appointmentsJson.error ?? "No se pudo cargar tus citas");
        return;
      }

      setItems(appointmentsJson.items ?? []);

      if (catalogRes.ok) {
        setServices(catalogJson.services ?? []);
        setBarbers(catalogJson.barbers ?? []);
        setBranches(catalogJson.branches ?? []);
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor para cargar tus citas.");
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      toast("Tu cita fue registrada y ya aparece en tu historial.");
    }
  }, [searchParams, toast]);

  async function createDemoAppointments() {
    setCreatingDemo(true);
    setError(null);
    const res = await fetch("/api/my/appointments/demo", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setCreatingDemo(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudieron crear citas demo");
      return;
    }
    await load();
  }

  return (
    <main className="flex-1 pt-28 pb-20">
      <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <div className="mb-10">
            <span className="section-label">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Historial
            </span>
            <h1
              className="mt-4 text-3xl font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Mis <span className="text-[var(--accent)]">Citas</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Historial y estado de tus reservas
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          {items.length === 0 && !error ? (
            <div className="glass-card p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] mb-4">
                <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">No tienes citas aún</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Reserva tu primera cita y aparecerá aquí.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a href="/reservar" className="btn-gold inline-flex">Reservar ahora</a>
                <button
                  onClick={() => void createDemoAppointments()}
                  disabled={creatingDemo}
                  className="admin-btn"
                  type="button"
                >
                  {creatingDemo ? "Creando demo..." : "Generar citas demo"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const st = statusConfig[item.status] ?? statusConfig.pending;
                
                // Map database entities
                const service = services.find((s) => s.id === item.service_id);
                const barber = barbers.find((b) => b.id === item.barber_id);
                const branch = service ? branches.find((br) => br.id === service.branch_id) : null;
                
                const parsed = parseNotes(item.notes);

                // Default placeholders if catalog not loaded yet
                const serviceName = service?.name ?? "Servicio de Barbería";
                const servicePrice = service ? `S/. ${service.price.toFixed(2)}` : null;
                const barberName = barber?.full_name ?? "Barbero Asignado";
                const branchName = branch?.name ?? "Sede Filo Estilo";

                return (
                  <div 
                    key={item.id} 
                    className="glass-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5 border border-white/5 hover:border-[var(--accent-border)]/40 transition-all duration-300 shadow-md group relative overflow-hidden"
                  >
                    {/* Golden luxury thin top border on hover */}
                    <div className="absolute top-0 left-0 w-0 h-[2.5px] bg-gradient-to-r from-[var(--accent)] to-amber-500 group-hover:w-full transition-all duration-500" />

                    {/* Left: Date Badge */}
                    <div className="flex md:flex-col items-center justify-between md:justify-center shrink-0 p-3 md:h-20 md:w-20 rounded-2xl bg-[#14141d]/80 border border-white/5 group-hover:border-[var(--accent-border)]/20 transition-all duration-300">
                      <div className="flex md:flex-col items-center gap-2 md:gap-0">
                        <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                          {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                        </span>
                        <span className="text-2xl font-black text-[var(--accent)] font-mono leading-none md:mt-1">
                          {new Date(item.appointment_date + "T00:00").getDate()}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] mt-1 hidden md:block">
                        {new Date(item.appointment_date + "T00:00").getFullYear()}
                      </span>
                    </div>

                    {/* Middle: Structured Details */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header Line */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[var(--accent)] transition-colors leading-tight font-display">
                            {serviceName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Con {barberName}
                            </span>
                            <span className="text-white/10 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 12.414A6 6 0 1012 13.828l4.243 4.243a1 1 0 001.414-1.414zM8 12a4 4 0 110-8 4 4 0 010 8z" />
                              </svg>
                              Sede {branchName}
                            </span>
                          </div>
                        </div>

                        {/* Price Badge */}
                        {servicePrice && (
                          <span className="text-sm font-bold font-mono text-[var(--accent)] bg-[var(--accent-soft)]/20 px-3 py-1 rounded-xl border border-[var(--accent-border)]/30 shrink-0">
                            {servicePrice}
                          </span>
                        )}
                      </div>

                      {/* Main Schedule Info Pill */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white font-medium shadow-sm">
                          <svg className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          Hora de Cita: <span className="font-bold text-[var(--accent)]">{item.start_time.slice(0, 5)}</span>
                        </span>
                        
                        {/* Legacy Notes Text representation if they are not parsed */}
                        {!parsed.isPagoFicticio && !parsed.userNotes && item.notes && (
                          <span className="text-xs text-[var(--text-secondary)] italic">
                            Nota: {item.notes}
                          </span>
                        )}
                      </div>

                      {/* Structured Payments & Groups */}
                      {(parsed.isPagoFicticio || parsed.personas || parsed.userNotes) && (
                        <div className="rounded-2xl border border-white/5 bg-[#14141d]/40 p-3 sm:p-4 space-y-3">
                          {/* Payment block */}
                          {parsed.isPagoFicticio && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              {/* Method badge */}
                              {parsed.method === "TARJETA" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-300 font-semibold shadow-sm">
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                  </svg>
                                  Tarjeta **** {parsed.card ?? "4242"}
                                </span>
                              )}
                              {parsed.method === "QR" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] text-amber-300 font-semibold shadow-sm">
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v2.25h12V3.75A2.25 2.25 0 0 0 15.75 1.5h-2.25M6 6H18v12H6V6Zm12-2.25v14.25a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 18V3.75" />
                                  </svg>
                                  Pago Móvil QR
                                </span>
                              )}
                              {parsed.method === "EFECTIVO" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] text-blue-300 font-semibold shadow-sm">
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 19.5h15M3.75 4.5v15M20.25 4.5v15M7.5 12h9" />
                                  </svg>
                                  Efectivo en Local
                                </span>
                              )}

                              {/* Transaction ID */}
                              {parsed.tx && (
                                <span className="font-mono text-[10px] text-[var(--text-muted)] bg-white/5 border border-white/5 rounded px-2 py-0.5" title="Código de transacción">
                                  ID: {parsed.tx}
                                </span>
                              )}

                              {/* Demo marker */}
                              <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest">
                                Pago Simulado
                              </span>
                            </div>
                          )}

                          {/* Group Booking details */}
                          {parsed.personas && parsed.personas > 1 && (
                            <div className="border-t border-white/5 pt-2.5">
                              <p className="text-[11px] font-bold text-[var(--accent)] inline-flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Reserva Grupal ({parsed.personas} personas)
                              </p>
                              {parsed.horarios && parsed.horarios.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Horarios del grupo:</span>
                                  {parsed.horarios.map((slotTime, sIdx) => {
                                    const isCurrent = slotTime.slice(0, 5) === item.start_time.slice(0, 5);
                                    return (
                                      <span 
                                        key={sIdx} 
                                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold font-mono ${
                                          isCurrent 
                                            ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm" 
                                            : "bg-white/5 border border-white/5 text-[var(--text-muted)]"
                                        }`}
                                      >
                                        {slotTime.slice(0, 5)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Client free notes */}
                          {parsed.userNotes && (
                            <div className="border-t border-white/5 pt-2.5 flex items-start gap-2">
                              <svg className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Nota adicional del cliente</p>
                                <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed mt-0.5">
                                  "{parsed.userNotes}"
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Status and Details Button */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                      {/* Dynamic Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${st.bg} ${st.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {st.label}
                      </span>
                      
                      {/* Created date sutil label */}
                      {item.id && (
                        <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                          Ref: #{item.id.slice(0, 8).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </main>
  );
}

export default function MyAppointmentsPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 pt-28 pb-20">
            <div className="mx-auto max-w-5xl px-6">
              <div className="glass-card p-6">Cargando tus citas...</div>
            </div>
          </main>
        }
      >
        <MyAppointmentsContent />
      </Suspense>
      <Footer />
    </>
  );
}
