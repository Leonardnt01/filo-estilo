/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

type Branch = { id: string; name: string };
type Barber = { id: string; full_name: string };
type BusinessHour = { id: string; barber_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean };

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminBusinessHoursPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [items, setItems] = useState<BusinessHour[]>([]);
  const [form, setForm] = useState({ barber_id: "", day_of_week: "1", start_time: "09:00", end_time: "18:00" });
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!branchId) return;
    const [bRes, hRes] = await Promise.all([
      fetch(`/api/admin/barbers?only_active=true&branch_id=${branchId}`),
      fetch(`/api/admin/business-hours?branch_id=${branchId}`),
    ]);
    const bJson = await bRes.json().catch(() => ({}));
    const hJson = await hRes.json().catch(() => ({}));
    if (!bRes.ok) { toast(bJson.error ?? "Error barberos", "error"); return; }
    if (!hRes.ok) { toast(hJson.error ?? "Error horarios", "error"); return; }
    const nextBarbers = bJson.items ?? [];
    setBarbers(nextBarbers); setItems(hJson.items ?? []);
    if (!form.barber_id && nextBarbers[0]?.id) setForm((s) => ({ ...s, barber_id: nextBarbers[0].id }));
  }

  useEffect(() => {
    async function loadBranches() {
      const res = await fetch("/api/admin/branches");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const nextBranches = json.items ?? [];
      setBranches(nextBranches);
      if (!branchId && nextBranches[0]?.id) setBranchId(nextBranches[0].id);
    }
    void loadBranches();
  }, []);

  useEffect(() => { void load(); }, [branchId]);

  async function createHour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/business-hours", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch_id: branchId, barber_id: form.barber_id, day_of_week: Number(form.day_of_week), start_time: form.start_time, end_time: form.end_time }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo crear horario", "error"); return; }
    toast("Horario creado correctamente"); setShowForm(false); await load();
  }

  async function removeHour(id: string) {
    const ok = await confirm({
      title: "Eliminar horario",
      message: "¿Seguro que deseas eliminar este horario de atención?",
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/business-hours/${id}`, { method: "DELETE" });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo eliminar", "error"); return; }
    toast("Horario eliminado"); await load();
  }

  const grouped = barbers.map((b) => ({
    barber: b,
    hours: items.filter((h) => h.barber_id === b.id).sort((a, c) => a.day_of_week - c.day_of_week),
  })).filter((g) => g.hours.length > 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Horarios de <span style={{ color: "var(--accent)" }}>Atención</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} horarios configurados</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="admin-select min-w-48">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary" disabled={!branchId}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
            Nuevo Horario
          </button>
        </div>
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

      {items.length === 0 && (
        <div className="admin-card p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <svg className="h-8 w-8" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-lg font-semibold">No hay horarios configurados</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Crea un horario para comenzar a recibir citas</p>
        </div>
      )}
    </section>
  );
}
