/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { AdminHeaderSkeleton, AdminTableSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/admin-client-cache";

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; is_active: boolean };
type Branch = { id: string; name: string };

export default function AdminServicesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);

  async function load() {
    if (!branchId) return;
    setLoading(true);
    try {
      const json = await fetchCachedJson<{ items?: Service[] }>(`/api/admin/services?branch_id=${branchId}`, { ttlMs: 12_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar servicios", "error");
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

  async function saveService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isEdit = !!editingItem;
    const url = isEdit ? `/api/admin/services/${editingItem.id}` : "/api/admin/services";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        branch_id: branchId, 
        name: form.name, 
        description: form.description || null, 
        price: Number(form.price), 
        duration_minutes: Number(form.duration_minutes) 
      }),
    });

    if (!res.ok) { 
      const json = await res.json().catch(() => ({})); 
      toast(json.error ?? `No se pudo ${isEdit ? "actualizar" : "crear"} servicio`, "error"); 
      return; 
    }

    invalidateCacheByPrefix("/api/admin/services");

    const savedItem = {
      id: isEdit ? editingItem.id : Math.random().toString(),
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      is_active: isEdit ? editingItem.is_active : true
    } as Service;

    if (isEdit) {
      setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } else {
      setItems((prev) => [savedItem, ...prev]);
    }

    setForm({ name: "", description: "", price: "", duration_minutes: "" }); 
    setEditingItem(null);
    toast(isEdit ? "Servicio actualizado correctamente" : "Servicio creado correctamente"); 
    setShowForm(false); 
  }

  async function toggleActive(item: Service) {
    const nextState = !item.is_active;
    const ok = await confirm({
      title: nextState ? "Activar servicio" : "Desactivar servicio",
      message: nextState
        ? "¿Deseas volver a activar este servicio para que se pueda reservar?"
        : "¿Seguro que deseas desactivar este servicio? Los clientes no podrán reservarlo.",
      confirmText: nextState ? "Activar" : "Desactivar",
      variant: nextState ? "default" : "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/services/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextState }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo actualizar estado", "error"); return; }
    invalidateCacheByPrefix("/api/admin/services");
    
    // Actualización local sin parpadeo
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextState } : i)));
    
    toast(nextState ? "Servicio activado" : "Servicio desactivado");
  }

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Servicios</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{items.length} servicios registrados en esta sede</p>
          
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
        <button onClick={() => { setEditingItem(null); setForm({ name: "", description: "", price: "", duration_minutes: "" }); setShowForm(!showForm); }} className="admin-btn admin-btn-primary !h-11 !px-6" disabled={!branchId}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
          Nuevo Servicio
        </button>
      </div>
      )}

      {showForm && (
        <form onSubmit={saveService} className="admin-card space-y-6 animate-fade-in border-2" style={{ borderColor: "var(--accent-border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {editingItem ? "Editar Servicio" : "Crear nuevo servicio"}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" /></svg>
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="admin-input w-full" required />
            <input placeholder="Descripción" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="admin-input w-full" />
            <input placeholder="Precio (S/)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} className="admin-input w-full" required />
            <input placeholder="Duración (min)" type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))} className="admin-input w-full" required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="admin-btn px-6 font-bold">Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary px-10 text-sm font-bold">
              {editingItem ? "Guardar Cambios" : "Crear Servicio"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <AdminTableSkeleton rows={6} />
      ) : (
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
                    <div className="flex gap-2">
                      <button 
                        className="admin-btn !h-9 gap-1.5" 
                        onClick={() => { 
                          setEditingItem(item); 
                          setForm({ 
                            name: item.name, 
                            description: item.description ?? "", 
                            price: String(item.price), 
                            duration_minutes: String(item.duration_minutes) 
                          }); 
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Editar
                      </button>
                      <button
                        className={`admin-btn !h-9 gap-1.5 font-semibold ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                        onClick={() => toggleActive(item)}
                      >
                        {item.is_active ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            Desactivar
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Activar
                          </>
                        )}
                      </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
