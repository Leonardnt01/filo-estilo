/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type MyAppointment = {
  id: string;
  customer_name: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pendiente",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  confirmed:   { label: "Confirmada",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  in_progress: { label: "En progreso", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  completed:   { label: "Completada",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  cancelled:   { label: "Cancelada",   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  no_show:     { label: "No asistió",  color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};

export default function MyAppointmentsPage() {
  const [items, setItems] = useState<MyAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);

  async function load() {
    const res = await fetch("/api/my/appointments");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "No se pudo cargar tus citas"); return; }
    setItems(json.items ?? []);
  }

  useEffect(() => { void load(); }, []);

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
    <>
      <Navbar />
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
                return (
                  <div key={item.id} className="glass-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Date badge */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)]">
                      <span className="text-xs text-[var(--text-muted)] uppercase">
                        {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-[var(--accent)]">
                        {new Date(item.appointment_date + "T00:00").getDate()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{item.appointment_date}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        Hora: {item.start_time}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>

                    {/* Status */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${st.bg} ${st.color}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
