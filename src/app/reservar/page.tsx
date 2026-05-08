"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number };
type Barber = { id: string; full_name: string; specialty: string | null };
type Slot = { start_time: string; end_time: string };

const STEPS = [
  { label: "Servicio", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Barbero", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Fecha", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Horario", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Confirmar", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function ReservarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  /* Current step indicator */
  const currentStep = useMemo(() => {
    if (!serviceId) return 0;
    if (!barberId) return 1;
    if (!date) return 2;
    if (!slotStart) return 3;
    return 4;
  }, [serviceId, barberId, date, slotStart]);

  const minDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  const maxDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 60);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      const res = await fetch("/api/booking/catalog");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "No se pudo cargar catálogo"); return; }
      setServices(json.services ?? []);
      setBarbers(json.barbers ?? []);
      if (json.services?.[0]?.id) setServiceId(json.services[0].id);
      if (json.barbers?.[0]?.id) setBarberId(json.barbers[0].id);
    }
    void loadCatalog();
  }, []);

  async function loadSlots() {
    setError(null);
    setSuccess(null);
    setSlotStart("");
    if (!serviceId || !barberId || !date) { setSlots([]); return; }
    setLoadingSlots(true);
    const res = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: serviceId, barber_id: barberId, appointment_date: date }),
    });
    const json = await res.json().catch(() => ({}));
    setLoadingSlots(false);
    if (!res.ok) { setError(json.error ?? "No se pudo consultar disponibilidad"); setSlots([]); return; }
    setSlots(json.slots ?? []);
  }

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId) ?? null, [barbers, barberId]);

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slotStart) { setError("Debes seleccionar un horario"); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/my/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: date,
        start_time: slotStart,
        notes: notes || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "No se pudo crear la cita"); return; }
    setSuccess("¡Cita reservada correctamente!");
    setNotes("");
    await loadSlots();
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <span className="section-label">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reservación
            </span>
            <h1
              className="mt-4 text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Reserva tu <span className="text-[var(--accent)]">Cita</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Completa los siguientes pasos para agendar tu visita
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    i <= currentStep
                      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-strong)]"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d={step.icon} />
                  </svg>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px ${i < currentStep ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={book} className="space-y-8">
            {/* Service selection */}
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-sm font-bold">1</span>
                Elige tu servicio
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`text-left rounded-xl p-4 border transition-all ${
                      serviceId === s.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/5"
                        : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{s.name}</span>
                      <span className="shrink-0 text-sm font-bold text-[var(--accent)]">S/ {s.price}</span>
                    </div>
                    {s.description && <p className="mt-1 text-xs text-[var(--text-muted)]">{s.description}</p>}
                    <p className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {s.duration_minutes} min
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Barber selection */}
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-sm font-bold">2</span>
                Elige tu barbero
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {barbers.map((b, i) => {
                  const initials = b.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                  const hues = [32, 45, 20];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBarberId(b.id)}
                      className={`flex items-center gap-4 text-left rounded-xl p-4 border transition-all ${
                        barberId === b.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/5"
                          : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                      }`}
                    >
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-[var(--accent-border)]"
                        style={{
                          background: `linear-gradient(135deg, hsl(${hues[i % 3]},40%,18%), hsl(${hues[i % 3]},30%,12%))`,
                          color: `hsl(${hues[i % 3]},60%,65%)`,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.full_name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{b.specialty ?? "Barbero profesional"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date + slots */}
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-sm font-bold">3</span>
                Fecha y horario
              </h2>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-dark sm:max-w-[220px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => void loadSlots()}
                  disabled={loadingSlots || !serviceId || !barberId || !date}
                  className="btn-outline !py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loadingSlots ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Consultando...
                    </span>
                  ) : (
                    "Consultar horarios"
                  )}
                </button>
              </div>

              {/* Time slots grid */}
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => setSlotStart(slot.start_time)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium border transition-all ${
                      slotStart === slot.start_time
                        ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20"
                        : "bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                    }`}
                  >
                    {slot.start_time}
                  </button>
                ))}
                {!loadingSlots && slots.length === 0 && date && (
                  <p className="text-sm text-[var(--text-muted)] py-2">Sin horarios disponibles para esta fecha</p>
                )}
              </div>
            </div>

            {/* Notes + Summary */}
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-sm font-bold">4</span>
                Confirmar reserva
              </h2>

              <textarea
                placeholder="Notas adicionales (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-dark !h-20 resize-none mb-4"
              />

              {/* Summary card */}
              <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider">Resumen</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)]">Servicio</span>
                    <p className="font-medium">{selectedService?.name ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Barbero</span>
                    <p className="font-medium">{selectedBarber?.full_name ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Duración</span>
                    <p className="font-medium">{selectedService?.duration_minutes ?? "—"} min</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Horario</span>
                    <p className="font-medium">{slotStart || "No seleccionado"}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Fecha</span>
                    <p className="font-medium">{date || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Precio</span>
                    <p className="text-lg font-bold text-[var(--accent)]">S/ {selectedService?.price ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !date || !slotStart || !serviceId || !barberId}
                className="btn-gold w-full !py-3.5 mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Reservando...
                  </span>
                ) : (
                  "Confirmar Reserva"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
