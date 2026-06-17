/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { AdminCardsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";

type Barber = { id: string; full_name: string; specialty: string | null; image_url: string | null; is_active: boolean };
type Branch = { id: string; name: string };

export default function AdminBarbersPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Barber[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", specialty: "", image_url: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Barber | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const branchNameById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  async function load() {
    if (!branchId) return;
    setLoading(true);
    try {
      const json = await fetchCachedJson<{ items?: Barber[] }>(`/api/admin/barbers?branch_id=${branchId}`, { ttlMs: 12_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar barberos", "error");
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
        const selected = (remembered && nextBranches.find((b) => b.id === remembered)?.id) || nextBranches[0]?.id || "";
        setBranches(nextBranches);
        if (!branchId && selected) setBranchId(selected);
      } finally {
        setBranchesLoading(false);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => { void load(); }, [branchId]);
  useEffect(() => {
    if (branchId) localStorage.setItem("admin.branch_id", branchId);
  }, [branchId]);

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

  async function saveBarber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isEdit = !!editingItem;
    const url = isEdit ? `/api/admin/barbers/${editingItem.id}` : "/api/admin/barbers";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        branch_id: branchId, 
        full_name: form.full_name, 
        specialty: form.specialty || null, 
        image_url: form.image_url || null 
      }),
    });

    if (!res.ok) { 
      const json = await res.json().catch(() => ({})); 
      toast(json.error ?? `No se pudo ${isEdit ? "actualizar" : "crear"} barbero`, "error"); 
      return; 
    }
    invalidateCacheByPrefix("/api/admin/barbers");

    const savedItem = { 
      id: isEdit ? editingItem.id : Math.random().toString(), // El ID real vendrá en el próximo load o refresh, pero esto evita el parpadeo
      full_name: form.full_name,
      specialty: form.specialty || null,
      image_url: form.image_url || null,
      is_active: isEdit ? editingItem.is_active : true,
      branch_id: branchId
    } as Barber;

    if (isEdit) {
      setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } else {
      setItems((prev) => [savedItem, ...prev]);
    }

    setForm({ full_name: "", specialty: "", image_url: "" }); 
    setImagePreview(null);
    setEditingItem(null);
    toast(isEdit ? "Barbero actualizado correctamente" : "Barbero creado correctamente"); 
    setShowForm(false); 
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
    invalidateCacheByPrefix("/api/admin/barbers");
    
    // Actualización local para evitar recarga de toda la lista
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextState } : i)));
    
    toast(nextState ? "Barbero activado" : "Barbero desactivado");
  }

  const hues = [32, 45, 20, 55, 38, 28];

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Barberos</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} barberos registrados en esta sede</p>
          
          {/* Branch Tabs Selector */}
          <div className="mt-6 flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setBranchId(b.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all border ${
                  branchId === b.id 
                    ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-lg shadow-[var(--accent-soft)]" 
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { setEditingItem(null); setForm({ full_name: "", specialty: "", image_url: "" }); setImagePreview(null); setShowForm(!showForm); }} className="admin-btn admin-btn-primary !h-11 !px-6" disabled={!branchId}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
          Nuevo Barbero
        </button>
      </div>
      )}

      {showForm && (
        <form onSubmit={saveBarber} className="admin-card space-y-6 animate-fade-in border-2" style={{ borderColor: "var(--accent-border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {editingItem ? "Editar Barbero" : "Crear nuevo barbero"}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" /></svg>
            </button>
          </div>
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
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setImagePreview(null); }} className="admin-btn px-6 font-bold">Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary px-10 text-sm font-bold">
              {editingItem ? "Guardar Cambios" : "Crear Barbero"}
            </button>
          </div>
        </form>
      )}

      {/* Barbers grid */}
      {loading ? (
        <AdminCardsSkeleton count={6} />
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const initials = item.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const hue = hues[i % hues.length];
          const branchName = branchNameById.get(branchId) ?? "Sede";
          return (
            <div key={item.id} className="admin-card flex flex-col items-center text-center relative pt-8">
              <div className="absolute top-3 right-3 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent-border)" }}>
                {branchName}
              </div>
              {item.image_url ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2" style={{ borderColor: "var(--accent-border)" }}>
                  <Image
                    src={item.image_url}
                    alt={item.full_name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
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

              <div className="mt-6 flex gap-2 w-full">
                <button 
                  className="admin-btn flex-1 !h-10 gap-2 font-semibold" 
                  onClick={() => { 
                    setEditingItem(item); 
                    setForm({ full_name: item.full_name, specialty: item.specialty ?? "", image_url: item.image_url ?? "" }); 
                    setImagePreview(item.image_url);
                    setShowForm(true); 
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Editar
                </button>
                <button
                  className={`admin-btn flex-1 !h-10 gap-2 font-semibold ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                  onClick={() => toggleActive(item)}
                >
                  {item.is_active ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      Desactivar
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
