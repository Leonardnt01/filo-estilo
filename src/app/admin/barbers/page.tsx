/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Barber = { id: string; full_name: string; specialty: string | null; image_url: string | null; is_active: boolean };

export default function AdminBarbersPage() {
  const [items, setItems] = useState<Barber[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", specialty: "", image_url: "" });
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  const [editingSpecialtyValue, setEditingSpecialtyValue] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/barbers");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "No se pudo cargar barberos"); return; }
    setItems(json.items ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function createBarber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/barbers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: form.full_name, specialty: form.specialty || null, image_url: form.image_url || null }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo crear barbero"); return; }
    setForm({ full_name: "", specialty: "", image_url: "" }); setSuccess("Barbero creado correctamente"); setShowForm(false); await load();
  }

  async function updateSpecialty(id: string, specialty: string) {
    const res = await fetch(`/api/admin/barbers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specialty }) });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo actualizar"); return; }
    setEditingSpecialtyId(null); setEditingSpecialtyValue(""); setSuccess("Especialidad actualizada"); await load();
  }

  async function deactivate(id: string) {
    if (!window.confirm("¿Seguro que deseas desactivar este barbero?")) return;
    const res = await fetch(`/api/admin/barbers/${id}`, { method: "DELETE" });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo desactivar"); return; }
    setSuccess("Barbero desactivado"); await load();
  }

  const hues = [32, 45, 20, 55, 38, 28];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Barberos</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} barberos registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          Nuevo Barbero
        </button>
      </div>

      {showForm && (
        <form onSubmit={createBarber} className="admin-card space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Crear nuevo barbero</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} className="admin-input w-full" required />
            <input placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))} className="admin-input w-full" />
            <input placeholder="URL Imagen" value={form.image_url} onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))} className="admin-input w-full" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="admin-btn admin-btn-primary">Crear Barbero</button>
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

      {/* Barbers grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const initials = item.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const hue = hues[i % hues.length];
          return (
            <div key={item.id} className="admin-card flex flex-col items-center text-center">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue},40%,18%), hsl(${hue},30%,12%))`,
                  color: `hsl(${hue},60%,65%)`,
                  borderColor: "var(--accent-border)",
                }}
              >
                {initials}
              </div>
              <h3 className="mt-3 font-semibold" style={{ color: "var(--text-primary)" }}>{item.full_name}</h3>
              <p className="text-sm" style={{ color: "var(--accent)" }}>{item.specialty ?? "Sin especialidad"}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {item.is_active ? "Activo" : "Inactivo"}
              </span>

              <div className="mt-4 flex gap-2 w-full">
                {editingSpecialtyId === item.id ? (
                  <div className="flex gap-1.5 w-full">
                    <input value={editingSpecialtyValue} onChange={(e) => setEditingSpecialtyValue(e.target.value)} className="admin-input flex-1" />
                    <button className="admin-btn admin-btn-primary" onClick={() => updateSpecialty(item.id, editingSpecialtyValue)}>OK</button>
                    <button className="admin-btn" onClick={() => { setEditingSpecialtyId(null); setEditingSpecialtyValue(""); }}>✕</button>
                  </div>
                ) : (
                  <>
                    <button className="admin-btn flex-1" onClick={() => { setEditingSpecialtyId(item.id); setEditingSpecialtyValue(item.specialty ?? ""); }}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Editar
                    </button>
                    <button className="admin-btn admin-btn-danger flex-1" onClick={() => deactivate(item.id)}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      Desactivar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
