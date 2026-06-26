/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import {
  FaBan,
  FaCircleCheck,
  FaLocationDot,
  FaPen,
  FaPlus,
  FaTag,
  FaXmark,
  FaCalendarDays,
  FaPercent,
} from "react-icons/fa6";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { AdminCardsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";

type Promotion = {
  id: string;
  branch_id: string | null;
  title: string;
  description: string | null;
  discount_percent: number;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
};

type Branch = { id: string; name: string };

export default function AdminPromotionsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Promotion | null>(null);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_percent: "10",
    branch_id: "", // vacío para global (null)
    starts_at: "",
    ends_at: "",
    sort_order: "1",
  });

  async function load() {
    setLoading(true);
    try {
      // Si el filtro de sede es "all", traemos todo (la API filtrará por permisos del usuario en GET)
      const url = selectedBranchFilter === "all" 
        ? "/api/admin/promotions" 
        : `/api/admin/promotions?branch_id=${selectedBranchFilter}`;
      
      const json = await fetchCachedJson<{ items?: Promotion[] }>(url, { ttlMs: 10_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar promociones", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadBranches() {
      setBranchesLoading(true);
      try {
        const json = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
        setBranches(json.items ?? []);
      } catch (e) {
        console.error("Error al cargar sedes:", e);
      } finally {
        setBranchesLoading(false);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    void load();
  }, [selectedBranchFilter]);

  async function savePromotion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isEdit = !!editingItem;
    const url = isEdit ? `/api/admin/promotions/${editingItem.id}` : "/api/admin/promotions";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      branch_id: form.branch_id || null,
      title: form.title,
      description: form.description || null,
      discount_percent: Number(form.discount_percent),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      sort_order: Number(form.sort_order),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? `No se pudo ${isEdit ? "actualizar" : "crear"} promoción`, "error");
      return;
    }

    invalidateCacheByPrefix("/api/admin/promotions");

    const jsonResponse = await res.json();
    const savedItem = jsonResponse.item ?? {
      id: isEdit ? editingItem.id : Math.random().toString(),
      ...payload,
      is_active: isEdit ? editingItem.is_active : true,
    };

    if (isEdit) {
      setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
      toast("Promoción actualizada correctamente");
    } else {
      setItems((prev) => [savedItem, ...prev]);
      toast("Promoción creada correctamente");
    }

    setForm({
      title: "",
      description: "",
      discount_percent: "10",
      branch_id: "",
      starts_at: "",
      ends_at: "",
      sort_order: "1",
    });
    setEditingItem(null);
    setShowForm(false);
  }

  async function toggleActive(item: Promotion) {
    const nextState = !item.is_active;
    const ok = await confirm({
      title: nextState ? "Activar promoción" : "Desactivar promoción",
      message: nextState
        ? "¿Deseas volver a activar esta promoción para los clientes?"
        : "¿Seguro que deseas desactivar esta promoción? Ya no se podrá usar en reservas.",
      confirmText: nextState ? "Activar" : "Desactivar",
      variant: nextState ? "default" : "danger",
    });
    if (!ok) return;

    const res = await fetch(`/api/admin/promotions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextState }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? "No se pudo actualizar estado", "error");
      return;
    }

    invalidateCacheByPrefix("/api/admin/promotions");

    // Local update without reload flash
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextState } : i)));
    toast(nextState ? "Promoción activada" : "Promoción desactivada");
  }

  function handleEditClick(item: Promotion) {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      discount_percent: String(item.discount_percent),
      branch_id: item.branch_id ?? "",
      starts_at: item.starts_at ? item.starts_at.slice(0, 10) : "",
      ends_at: item.ends_at ? item.ends_at.slice(0, 10) : "",
      sort_order: String(item.sort_order),
    });
    setShowForm(true);
  }

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Gestión de <span style={{ color: "var(--accent)" }}>Promociones</span>
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {items.length} promociones registradas en el sistema
            </p>
            
            {/* Sede Selector Tabs */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBranchFilter("all")}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
                  selectedBranchFilter === "all"
                    ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-lg shadow-[var(--accent-soft)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                }`}
              >
                Todas las Sedes
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchFilter(b.id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
                    selectedBranchFilter === b.id
                      ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-lg shadow-[var(--accent-soft)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                  }`}
                >
                  <FaLocationDot className="h-3 w-3" />
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setForm({
                title: "",
                description: "",
                discount_percent: "10",
                branch_id: selectedBranchFilter === "all" ? "" : selectedBranchFilter,
                starts_at: "",
                ends_at: "",
                sort_order: "1",
              });
              setShowForm(true);
            }}
            className="admin-btn admin-btn-primary !h-11 !px-6 flex items-center gap-2"
          >
            <FaPlus className="h-4 w-4" />
            Nueva Promoción
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={savePromotion} className="admin-card space-y-6 animate-fade-in border-2" style={{ borderColor: "var(--accent-border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <FaTag className="h-4 w-4" />
              {editingItem ? "Editar Promoción" : "Crear nueva promoción"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              <FaXmark className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Título de la promoción</label>
              <input
                placeholder="Ej: Promo Corte + Barba"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                className="admin-input w-full"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Descripción</label>
              <input
                placeholder="Ej: 20% de descuento en el total"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="admin-input w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Descuento (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="20"
                  value={form.discount_percent}
                  onChange={(e) => setForm((s) => ({ ...s, discount_percent: e.target.value }))}
                  className="admin-input w-full pr-10"
                  required
                />
                <FaPercent className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Asignar a Sede</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm((s) => ({ ...s, branch_id: e.target.value }))}
                className="admin-select w-full !bg-[var(--bg-secondary)]"
              >
                <option value="">Global (Todas las sedes)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Fecha Inicio (opcional)</label>
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => setForm((s) => ({ ...s, starts_at: e.target.value }))}
                className="admin-input w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Fecha Fin (opcional)</label>
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm((s) => ({ ...s, ends_at: e.target.value }))}
                className="admin-input w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Orden de prioridad</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={form.sort_order}
                onChange={(e) => setForm((s) => ({ ...s, sort_order: e.target.value }))}
                className="admin-input w-full"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              className="admin-btn border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] !h-11 px-5"
            >
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary !h-11 px-6">
              {editingItem ? "Guardar Cambios" : "Crear Promoción"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <AdminCardsSkeleton count={6} />
      ) : items.length === 0 ? (
        <div className="admin-card p-12 text-center text-[var(--text-muted)] italic">
          No hay promociones registradas en este momento.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`admin-card bg-[var(--bg-surface)] border hover:border-[var(--accent-border)] transition-all flex flex-col justify-between p-5 relative overflow-hidden ${
                !item.is_active ? "opacity-60" : ""
              }`}
              style={{ borderLeft: `4px solid ${item.is_active ? "var(--accent)" : "#9ca3af"}` }}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                    {item.discount_percent}% OFF
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {item.branch_id
                      ? branches.find((b) => b.id === item.branch_id)?.name ?? "Sede"
                      : "Global"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{item.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4 min-h-[32px]">
                  {item.description || "Sin descripción proporcionada."}
                </p>

                {(item.starts_at || item.ends_at) && (
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-4">
                    <FaCalendarDays className="h-3 w-3" />
                    <span>
                      {item.starts_at ? new Date(item.starts_at).toLocaleDateString("es-PE") : "—"} al{" "}
                      {item.ends_at ? new Date(item.ends_at).toLocaleDateString("es-PE") : "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-2">
                <button
                  onClick={() => toggleActive(item)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    item.is_active
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20"
                  }`}
                >
                  {item.is_active ? "Activo" : "Inactivo"}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-all cursor-pointer"
                    title="Editar"
                  >
                    <FaPen className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
