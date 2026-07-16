/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  FaBan,
  FaCircleCheck,
  FaClock,
  FaImage,
  FaLocationDot,
  FaPen,
  FaPlus,
  FaScissors,
  FaTag,
  FaXmark,
} from "react-icons/fa6";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { AdminCardsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";
import { resolveServiceImage } from "@/lib/catalog-images";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
};
type Branch = { id: string; name: string };

export default function AdminServicesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "", image_url: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function getServicePreview(name: string, imageUrl?: string | null) {
    return resolveServiceImage(name || "Servicio", imageUrl ?? null);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap branches once on mount
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload list only when the selected branch changes
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
        duration_minutes: Number(form.duration_minutes),
        image_url: form.image_url || null,
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
      image_url: form.image_url || null,
      is_active: isEdit ? editingItem.is_active : true
    } as Service;

    if (isEdit) {
      setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } else {
      setItems((prev) => [savedItem, ...prev]);
    }

    setForm({ name: "", description: "", price: "", duration_minutes: "", image_url: "" }); 
    setImagePreview(null);
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

  const branchName = branches.find((b) => b.id === branchId)?.name ?? "Sede";

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
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {items.length} servicios registrados en esta sede
          </p>
          
          {/* Branch Tabs Selector */}
          <div className="mt-6 flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setBranchId(b.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all border flex items-center gap-1.5 ${
                  branchId === b.id 
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
          onClick={() => { setEditingItem(null); setForm({ name: "", description: "", price: "", duration_minutes: "", image_url: "" }); setImagePreview(null); setShowForm(!showForm); }} 
          className="admin-btn admin-btn-primary !h-11 !px-6 flex items-center gap-2" 
          disabled={!branchId}
        >
          <FaPlus className="h-4 w-4" />
          Nuevo Servicio
        </button>
      </div>
      )}

      {showForm && (
        <form onSubmit={saveService} className="admin-card space-y-6 animate-fade-in border-2" style={{ borderColor: "var(--accent-border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <FaScissors className="h-4 w-4" />
              {editingItem ? "Editar Servicio" : "Crear nuevo servicio"}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setImagePreview(null); }} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <FaXmark className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-[1fr_200px]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Nombre del servicio</label>
                  <input placeholder="Ej: Corte Premium" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="admin-input w-full" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Descripción</label>
                  <input placeholder="Ej: Corte moderno con diseño" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="admin-input w-full" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Precio (S/)</label>
                  <input placeholder="35.00" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} className="admin-input w-full" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Duración (min)</label>
                  <input placeholder="30" type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))} className="admin-input w-full" required />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Imagen del servicio</label>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} className="admin-btn flex items-center gap-2">
                    <FaImage className="h-3.5 w-3.5" />
                    Subir foto
                  </button>
                  <input
                    placeholder="O pegar URL de imagen"
                    value={form.image_url.startsWith("data:") ? "" : form.image_url}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setForm((s) => ({ ...s, image_url: nextValue }));
                      setImagePreview(nextValue || getServicePreview(form.name, null));
                    }}
                    className="admin-input flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Image preview */}
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <div className="relative h-36 w-36 rounded-2xl overflow-hidden border-2" style={{ borderColor: "var(--accent-border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                  <button type="button" onClick={() => { setImagePreview(null); setForm((s) => ({ ...s, image_url: "" })); }}
                    className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow-lg hover:bg-red-600 transition-colors">
                    <FaXmark className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed gap-2" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}>
                  <FaScissors className="h-8 w-8" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sin imagen</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setImagePreview(null); }} className="admin-btn px-6 font-bold">Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary px-10 text-sm font-bold">
              {editingItem ? "Guardar Cambios" : "Crear Servicio"}
            </button>
          </div>
        </form>
      )}

      {/* Services grid */}
      {loading ? (
        <AdminCardsSkeleton count={6} />
      ) : items.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <FaScissors className="h-8 w-8" style={{ color: "var(--accent)" }} />
          </div>
          <h3 className="text-lg font-semibold">Aún no hay servicios en esta sede</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Crea tu primer servicio con el botón &ldquo;Nuevo Servicio&rdquo; para que los clientes puedan reservarlo.
          </p>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`admin-card relative overflow-hidden rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-xl ${
              item.is_active
                ? "border-[var(--border)] hover:border-[var(--accent-border)]/60"
                : "border-[var(--border)] opacity-60 hover:opacity-80"
            }`}
          >
            {/* Top accent line on hover */}
            <div className="absolute top-0 left-0 w-0 h-[2px] bg-gradient-to-r from-[var(--accent)] to-amber-500 group-hover:w-full transition-all duration-500" />

            {/* Image area */}
            <div className="relative h-40 w-full bg-[var(--bg-secondary)] overflow-hidden">
              <Image
                src={getServicePreview(item.name, item.image_url)}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Price badge overlay */}
              <div className="absolute bottom-3 right-3">
                <span className="inline-flex items-center gap-1 rounded-xl bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-[var(--accent-border)] px-3 py-1.5 text-sm font-black font-mono text-[var(--accent)] shadow-lg">
                  <FaTag className="h-3 w-3" />
                  S/ {item.price.toFixed(2)}
                </span>
              </div>
              {/* Branch badge */}
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-primary)]/80 backdrop-blur-sm border border-[var(--border)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  <FaLocationDot className="h-2.5 w-2.5" />
                  {branchName}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  <FaClock className="h-3 w-3 text-[var(--accent)]" />
                  {item.duration_minutes} min
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {item.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  className="admin-btn flex-1 !h-9 gap-2 font-semibold text-xs" 
                  onClick={() => { 
                    setEditingItem(item); 
                    setForm({ 
                      name: item.name, 
                      description: item.description ?? "", 
                      price: String(item.price), 
                      duration_minutes: String(item.duration_minutes),
                      image_url: item.image_url ?? "",
                    }); 
                    setImagePreview(getServicePreview(item.name, item.image_url));
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <FaPen className="h-3 w-3" />
                  Editar
                </button>
                <button
                  className={`admin-btn flex-1 !h-9 gap-2 font-semibold text-xs ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                  onClick={() => toggleActive(item)}
                >
                  {item.is_active ? (
                    <>
                      <FaBan className="h-3 w-3" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <FaCircleCheck className="h-3 w-3" />
                      Activar
                    </>
                  )}
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
