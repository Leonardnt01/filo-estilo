/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";

type Barber = { id: string; full_name: string };
type BusinessHour = { id: string; barber_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean };

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminBusinessHoursPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [items, setItems] = useState<BusinessHour[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ barber_id: "", day_of_week: "1", start_time: "09:00", end_time: "18:00" });
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [bRes, hRes] = await Promise.all([fetch("/api/admin/barbers?only_active=true"), fetch("/api/admin/business-hours")]);
    const bJson = await bRes.json().catch(() => ({}));
    const hJson = await hRes.json().catch(() => ({}));
    if (!bRes.ok) { setError(bJson.error ?? "Error barberos"); return; }
    if (!hRes.ok) { setError(hJson.error ?? "Error horarios"); return; }
    const nextBarbers = bJson.items ?? [];
    setBarbers(nextBarbers); setItems(hJson.items ?? []);
    if (!form.barber_id && nextBarbers[0]?.id) setForm((s) => ({ ...s, barber_id: nextBarbers[0].id }));
  }

  useEffect(() => { void load(); }, []);

  async function createHour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/business-hours", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barber_id: form.barber_id, day_of_week: Number(form.day_of_week), start_time: form.start_time, end_time: form.end_time }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo crear horario"); return; }
    setSuccess("Horario creado correctamente"); setShowForm(false); await load();
  }

  async function removeHour(id: string) {
    if (!window.confirm("¿Eliminar este horario?")) return;
    const res = await fetch(`/api/admin/business-hours/${id}`, { method: "DELETE" });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo eliminar"); return; }
    setSuccess("Horario eliminado"); await load();
  }

  function barberName(id: string) { return barbers.find((b) => b.id === id)?.full_name ?? id; }

  /* Group items by barber */
  const grouped = barbers.map((b) => ({
    barber: b,
    hours: items.filter((h) => h.barber_id === b.id).sort((a, c) => a.day_of_week - c.day_of_week),
  })).filter((g) => g.hours.length > 0);

  const ungrouped = items.filter((h) => !barbers.find((b) => b.id === h.barber_id));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Horarios de <span style={{ color: "var(--accent)" }}>Atención</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} horarios configurados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          Nuevo Horario
        </button>
      </div>

      {showForm && (
        <form onSubmit={createHour} className="admin-card space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Crear nuevo horario</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={form.barber_id} onChange={(e) => setForm((s) => ({ ...s, barber_id: e.target.value }))} className="admin-select" required>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
            <select value={form.day_of_week} onChange={(e) => setForm((s) => ({ ...s, day_of_week: e.target.value }))} className="admin-select">
              {DAY_LABELS.map((label, idx) => <option key={label} value={idx}>{label}</option>)}
            </select>
            <input type="time" value={form.start_time} onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))} className="admin-input" required />
            <input type="time" value={form.end_time} onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))} className="admin-input" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="admin-btn admin-btn-primary">Crear Horario</button>
            <button type="button" onClick={() => setShowForm(false)} className="admin-btn">Cancelar</button>
          </div>
        </form>
      )}

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          <span>{error}</span><button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
          <span>{success}</span><button onClick={() => setSuccess(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Grouped by barber */}
      {grouped.map((g) => (
        <div key={g.barber.id} className="admin-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
              {g.barber.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{g.barber.full_name}</h3>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.hours.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--bg-surface-hover)", border: "1px solid var(--border)" }}>
                <div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{DAY_SHORT[h.day_of_week]}</span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{h.start_time} – {h.end_time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${h.is_active ? "status-completed" : "status-cancelled"}`}>
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {h.is_active ? "Activo" : "Off"}
                  </span>
                  <button className="admin-btn admin-btn-danger !px-2 !py-1" onClick={() => removeHour(h.id)}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Ungrouped hours (fallback) */}
      {ungrouped.length > 0 && (
        <div className="admin-card">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Otros horarios</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ungrouped.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--bg-surface-hover)", border: "1px solid var(--border)" }}>
                <div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{barberName(h.barber_id)} – {DAY_SHORT[h.day_of_week]}</span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{h.start_time} – {h.end_time}</p>
                </div>
                <button className="admin-btn admin-btn-danger !px-2 !py-1" onClick={() => removeHour(h.id)}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
