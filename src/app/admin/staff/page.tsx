/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { AdminHeaderSkeleton, AdminTableSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";

type Branch = { id: string; name: string };
type Membership = {
  id: string;
  user_id: string;
  user_email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  branch_id: string;
  role: "owner" | "admin" | "barber";
  is_active: boolean;
  created_at: string;
};

export default function AdminStaffPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    role: "barber" as "owner" | "admin" | "barber",
  });

  async function loadBranches() {
    setBranchesLoading(true);
    try {
      const json = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
      const next = json.items ?? [];
      const remembered = typeof window !== "undefined" ? localStorage.getItem("admin.branch_id") : "";
      const selected = (remembered && next.find((b) => b.id === remembered)?.id) || next[0]?.id || "";
      setBranches(next);
      if (!branchId && selected) setBranchId(selected);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar sedes", "error");
    } finally {
      setBranchesLoading(false);
    }
  }

  async function loadMemberships() {
    if (!branchId) return;
    setLoading(true);
    try {
      const json = await fetchCachedJson<{ items?: Membership[] }>(`/api/admin/memberships?branch_id=${branchId}`, { ttlMs: 12_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar staff", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    void loadMemberships();
  }, [branchId]);
  useEffect(() => {
    if (branchId) localStorage.setItem("admin.branch_id", branchId);
  }, [branchId]);

  async function addMembership(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!branchId) return;
    setSaving(true);
    const res = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        branch_id: branchId,
        role: form.role,
        is_active: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast(json.error ?? "No se pudo crear membresía", "error");
      return;
    }
    invalidateCacheByPrefix("/api/admin/memberships");
    await loadMemberships();
    setForm({ email: "", role: "barber" });
    toast("Staff agregado correctamente");
  }

  async function toggleActive(item: Membership) {
    const res = await fetch(`/api/admin/memberships/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast(json.error ?? "No se pudo actualizar el estado", "error");
      return;
    }
    invalidateCacheByPrefix("/api/admin/memberships");

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !item.is_active } : i)));
    toast(item.is_active ? "Membresía desactivada" : "Membresía activada");
  }

  const ROLE_CONFIG: Record<Membership["role"], { label: string; color: string; bg: string }> = {
    owner: { label: "Owner", color: "#d4af37", bg: "rgba(212, 175, 55, 0.1)" },
    admin: { label: "Admin", color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
    barber: { label: "Barber", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  };

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Staff</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Asigna owner/admin/barber por sede</p>
          
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
      </div>
      )}

      <form onSubmit={addMembership} className="admin-card space-y-6 border-2" style={{ borderColor: "var(--accent-border)" }}>
        <div>
          <h3 className="text-base font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
            Agregar nuevo miembro al equipo
          </h3>
          <p className="text-xs text-[var(--text-muted)]">El usuario debe estar previamente registrado en la plataforma.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold uppercase mb-1.5 opacity-60">Correo Electrónico</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeWidth="2" /></svg>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="ej: barbero@filoestilo.com"
                className="admin-input !pl-10 w-full"
                required
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase mb-1.5 opacity-60">Rol Asignado</label>
            <select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as Membership["role"] }))}
              className="admin-select w-full font-bold"
            >
              <option value="barber">Barbero</option>
              <option value="admin">Administrador</option>
              <option value="owner">Dueño / Owner</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-end">
            <button type="submit" className="admin-btn admin-btn-primary w-full !h-12 font-black uppercase tracking-widest text-xs" disabled={!branchId || saving || !form.email.trim()}>
              {saving ? "Procesando..." : "Vincular Staff"}
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <AdminTableSkeleton rows={5} />
      ) : (
      <div className="admin-card !p-0 overflow-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {item.full_name ?? "Sin nombre"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.user_email ?? "Sin email"}
                    </span>
                    <code className="text-[10px] mt-1 opacity-75">{item.user_id}</code>
                  </div>
                </td>
                <td>
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    style={{ color: ROLE_CONFIG[item.role].color, background: ROLE_CONFIG[item.role].bg, borderColor: ROLE_CONFIG[item.role].color + "40" }}
                  >
                    {ROLE_CONFIG[item.role].label}
                  </span>
                </td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="text-xs font-medium opacity-60">
                  {new Date(item.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td>
                  <button
                    onClick={() => void toggleActive(item)}
                    className={`admin-btn !h-9 gap-1.5 font-semibold ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="p-6 text-sm text-[var(--text-muted)]">No hay staff para esta sede.</p>
        )}
      </div>
      )}
    </section>
  );
}
