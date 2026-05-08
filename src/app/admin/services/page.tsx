/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; is_active: boolean };

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "" });
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const res = await fetch("/api/admin/services");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "No se pudo cargar servicios"); setLoading(false); return; }
    setItems(json.items ?? []); setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description || null, price: Number(form.price), duration_minutes: Number(form.duration_minutes) }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo crear servicio"); return; }
    setForm({ name: "", description: "", price: "", duration_minutes: "" }); setSuccess("Servicio creado correctamente"); setShowForm(false); await load();
  }

  async function updatePrice(id: string, nextPrice: number) {
    const res = await fetch(`/api/admin/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price: Number(nextPrice) }) });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setError(json.error ?? "No se pudo actualizar precio"); return; }
    setEditingPriceId(null); setEditingPriceValue(""); setSuccess("Precio actualizado"); await load();
  }

  async function toggleActive(item: Service) {
    const next = !item.is_active;
    const action = next ? "activar" : "desactivar";
    if (!window.confirm(`¿Seguro que deseas ${action} este servicio?`)) return;
    const res = await fetch(`/api/admin/services/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `No se pudo ${action} servicio`);
      return;
    }
    setSuccess(`Servicio ${next ? "activado" : "desactivado"}`);
    await load();
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Servicios</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} servicios registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          Nuevo Servicio
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createService} className="admin-card space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Crear nuevo servicio</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="admin-input w-full" required />
            <input placeholder="Descripción" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="admin-input w-full" />
            <input placeholder="Precio (S/)" type="number" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} className="admin-input w-full" required />
            <input placeholder="Duración (min)" type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))} className="admin-input w-full" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="admin-btn admin-btn-primary">Crear Servicio</button>
            <button type="button" onClick={() => setShowForm(false)} className="admin-btn">Cancelar</button>
          </div>
        </form>
      )}

      <Alerts error={error} success={success} onClear={() => { setError(null); setSuccess(null); }} />
      {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>}

      {/* Table */}
      <div className="admin-card !p-0 overflow-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  {item.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.description}</p>}
                </td>
                <td><span className="font-semibold" style={{ color: "var(--accent)" }}>S/ {item.price}</span></td>
                <td>
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {item.duration_minutes} min
                  </span>
                </td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  {editingPriceId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" step="0.01" value={editingPriceValue} onChange={(e) => setEditingPriceValue(e.target.value)} className="admin-input w-24" />
                      <button className="admin-btn admin-btn-primary" onClick={() => updatePrice(item.id, Number(editingPriceValue))}>OK</button>
                      <button className="admin-btn" onClick={() => { setEditingPriceId(null); setEditingPriceValue(""); }}>✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button className="admin-btn" onClick={() => { setEditingPriceId(item.id); setEditingPriceValue(String(item.price)); }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Precio
                      </button>
                      <button
                        className={`admin-btn ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                        onClick={() => toggleActive(item)}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        {item.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Alerts({ error, success, onClear }: { error: string | null; success: string | null; onClear: () => void }) {
  if (!error && !success) return null;
  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          <span>{error}</span>
          <button onClick={onClear} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
          <span>{success}</span>
          <button onClick={onClear} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
