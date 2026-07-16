/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBan,
  FaCircleCheck,
  FaImage,
  FaLocationDot,
  FaPen,
  FaPlus,
  FaStar,
  FaUserTie,
  FaXmark,
} from "react-icons/fa6";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { AdminCardsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";
import { resolveBarberImage } from "@/lib/catalog-images";

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

  function getBarberPreview(fullName: string, imageUrl?: string | null) {
    return resolveBarberImage(fullName || "Barbero", imageUrl ?? null);
  }

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
      id: isEdit ? editingItem.id : Math.random().toString(),
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
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {items.length} barberos registrados en esta sede
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
          onClick={() => { setEditingItem(null); setForm({ full_name: "", specialty: "", image_url: "" }); setImagePreview(null); setShowForm(!showForm); }} 
          className="admin-btn admin-btn-primary !h-11 !px-6 flex items-center gap-2" 
          disabled={!branchId}
        >
          <FaPlus className="h-4 w-4" />
          Nuevo Barbero
        </button>
      </div>
      )}

      {showForm && (
        <form onSubmit={saveBarber} className="admin-card space-y-6 animate-fade-in border-2" style={{ borderColor: "var(--accent-border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <FaUserTie className="h-4 w-4" />
              {editingItem ? "Editar Barbero" : "Crear nuevo barbero"}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setImagePreview(null); }} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <FaXmark className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-[1fr_180px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Nombre completo</label>
                <input placeholder="Ej: Luis Paredes" value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} className="admin-input w-full" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Especialidad</label>
                <input placeholder="Ej: Fade y barba, Cortes modernos" value={form.specialty} onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))} className="admin-input w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Foto del barbero</label>
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
                      setImagePreview(nextValue || getBarberPreview(form.full_name, null));
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="h-36 w-36 rounded-full object-cover border-2" style={{ borderColor: "var(--accent-border)" }} />
                  <button type="button" onClick={() => { setImagePreview(null); setForm((s) => ({ ...s, image_url: "" })); }}
                    className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors">
                    <FaXmark className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 border-dashed gap-2" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}>
                  <FaUserTie className="h-10 w-10" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Sin foto</span>
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
      ) : items.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <FaUserTie className="h-8 w-8" style={{ color: "var(--accent)" }} />
          </div>
          <h3 className="text-lg font-semibold">Aún no hay barberos en esta sede</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Agrega tu primer barbero con el botón &ldquo;Nuevo Barbero&rdquo; para que aparezca en las opciones de reserva.
          </p>
        </div>
      ) : (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const initials = item.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const hue = hues[i % hues.length];
          const branchName = branchNameById.get(branchId) ?? "Sede";
          const hasSpecialty = !!item.specialty;
          return (
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

              <div className="p-5 flex flex-col items-center text-center">
                {/* Branch badge */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                    <FaLocationDot className="h-2.5 w-2.5" />
                    {branchName}
                  </span>
                </div>

                {/* Avatar */}
                <div className="mt-2 relative">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-[3px] shadow-lg transition-transform duration-300 group-hover:scale-105" style={{ borderColor: "var(--accent-border)" }}>
                    <Image
                      src={getBarberPreview(item.full_name, item.image_url)}
                      alt={item.full_name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, hsla(${hue},40%,18%,0.08), hsla(${hue},30%,12%,0.22))` }}
                    />
                    {!item.image_url && (
                      <div className="absolute bottom-1 left-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--bg-primary)]/80 px-1.5 text-[10px] font-black text-[var(--accent)]">
                        {initials}
                      </div>
                    )}
                  </div>
                  {/* Online indicator */}
                  {item.is_active && (
                    <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)] shadow-sm" />
                  )}
                </div>

                {/* Name */}
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                  {item.full_name}
                </h3>

                {/* Role badge */}
                <div className="mt-2 flex items-center gap-1.5">
                  {hasSpecialty ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                      <FaStar className="h-2.5 w-2.5" />
                      Especialista
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                      <FaUserTie className="h-2.5 w-2.5" />
                      Barbero General
                    </span>
                  )}
                </div>

                {/* Specialty */}
                {item.specialty ? (
                  <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed max-w-[200px]">
                    {item.specialty}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] italic">
                    Sin especialidad definida
                  </p>
                )}

                {/* Status badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2 w-full">
                  <button 
                    className="admin-btn flex-1 !h-10 gap-2 font-semibold text-xs" 
                    onClick={() => { 
                      setEditingItem(item); 
                      setForm({ full_name: item.full_name, specialty: item.specialty ?? "", image_url: item.image_url ?? "" }); 
                      setImagePreview(getBarberPreview(item.full_name, item.image_url));
                      setShowForm(true); 
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <FaPen className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    className={`admin-btn flex-1 !h-10 gap-2 font-semibold text-xs ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                    onClick={() => toggleActive(item)}
                  >
                    {item.is_active ? (
                      <>
                        <FaBan className="h-3.5 w-3.5" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <FaCircleCheck className="h-3.5 w-3.5" />
                        Activar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
