/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

type Barber = { id: string; full_name: string; specialty: string | null; image_url: string | null; is_active: boolean };

export default function AdminBarbersPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Barber[]>([]);
  const [form, setForm] = useState({ full_name: "", specialty: "", image_url: "" });
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  const [editingSpecialtyValue, setEditingSpecialtyValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/barbers");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast(json.error ?? "No se pudo cargar barberos", "error"); return; }
    setItems(json.items ?? []);
  }

  useEffect(() => { void load(); }, []);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setForm((s) => ({ ...s, image_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function createBarber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/barbers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: form.full_name, specialty: form.specialty || null, image_url: form.image_url || null }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo crear barbero", "error"); return; }
    setForm({ full_name: "", specialty: "", image_url: "" }); setImagePreview(null);
    toast("Barbero creado correctamente"); setShowForm(false); await load();
  }

  async function updateSpecialty(id: string, specialty: string) {
    const res = await fetch(`/api/admin/barbers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specialty }) });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo actualizar", "error"); return; }
    setEditingSpecialtyId(null); setEditingSpecialtyValue(""); toast("Especialidad actualizada"); await load();
  }

  async function toggleActive(item: Barber) {
    const nextState = !item.is_active;
    const ok = await confirm({
      title: nextState ? "Activar barbero" : "Desactivar barbero",
      message: nextState
        ? "¿Deseas volver a activar este barbero para que aparezca en reservas?"
        : "¿Seguro que deseas desactivar este barbero? No aparecerá en las opciones de reserva.",
      confirmText: nextState ? "Activar" : "Desactivar",
      variant: nextState ? "default" : "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/barbers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextState }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo actualizar estado", "error"); return; }
    toast(nextState ? "Barbero activado" : "Barbero desactivado"); await load();
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <input placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} className="admin-input w-full" required />
              <input placeholder="Especialidad (ej: Fade y barba)" value={form.specialty} onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))} className="admin-input w-full" />
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>Foto del barbero</label>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} className="admin-btn flex-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Subir foto
                  </button>
                  <input
                    placeholder="O pegar URL de imagen"
                    value={form.image_url.startsWith("data:") ? "" : form.image_url}
                    onChange={(e) => { setForm((s) => ({ ...s, image_url: e.target.value })); setImagePreview(e.target.value || null); }}
                    className="admin-input flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Image preview */}
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="h-32 w-32 rounded-full object-cover border-2" style={{ borderColor: "var(--accent-border)" }} />
                  <button type="button" onClick={() => { setImagePreview(null); setForm((s) => ({ ...s, image_url: "" })); }}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs">✕</button>
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}>
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="admin-btn admin-btn-primary">Crear Barbero</button>
            <button type="button" onClick={() => { setShowForm(false); setImagePreview(null); }} className="admin-btn">Cancelar</button>
          </div>
        </form>
      )}

      {/* Barbers grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const initials = item.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const hue = hues[i % hues.length];
          return (
            <div key={item.id} className="admin-card flex flex-col items-center text-center">
              {item.image_url ? (
                <img src={item.image_url} alt={item.full_name} className="h-20 w-20 rounded-full object-cover border-2" style={{ borderColor: "var(--accent-border)" }} />
              ) : (
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                  style={{ background: `linear-gradient(135deg, hsl(${hue},40%,18%), hsl(${hue},30%,12%))`, color: `hsl(${hue},60%,65%)`, borderColor: "var(--accent-border)" }}
                >
                  {initials}
                </div>
              )}
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
                    <button
                      className={`admin-btn flex-1 ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                      onClick={() => toggleActive(item)}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      {item.is_active ? "Desactivar" : "Activar"}
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
