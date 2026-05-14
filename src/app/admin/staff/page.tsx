/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";

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
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    role: "barber" as "owner" | "admin" | "barber",
  });

  async function loadBranches() {
    const res = await fetch("/api/admin/branches");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(json.error ?? "No se pudo cargar sedes", "error");
      return;
    }
    const next = json.items ?? [];
    setBranches(next);
    if (!branchId && next[0]?.id) setBranchId(next[0].id);
  }

  async function loadMemberships() {
    if (!branchId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/memberships?branch_id=${branchId}`);
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast(json.error ?? "No se pudo cargar staff", "error");
      return;
    }
    setItems(json.items ?? []);
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    void loadMemberships();
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
    toast("Staff agregado correctamente");
    setForm({ email: "", role: "barber" });
    await loadMemberships();
  }

  async function toggleActive(item: Membership) {
    const res = await fetch(`/api/admin/memberships/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(json.error ?? "No se pudo actualizar estado", "error");
      return;
    }
    toast(item.is_active ? "Membresía desactivada" : "Membresía activada");
    await loadMemberships();
  }

  const roleLabel = useMemo(
    () =>
      ({
        owner: "Owner",
        admin: "Admin",
        barber: "Barber",
      }) as Record<Membership["role"], string>,
    [],
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Gestión de <span style={{ color: "var(--accent)" }}>Staff</span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Asigna owner/admin/barber por sede
          </p>
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="admin-select min-w-56">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={addMembership} className="admin-card space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Agregar miembro
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            placeholder="email del usuario (ej: barbero@mail.com)"
            className="admin-input"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as Membership["role"] }))}
            className="admin-select"
          >
            <option value="barber">Barber</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={!branchId || saving || !form.email.trim()}>
            {saving ? "Guardando..." : "Agregar Staff"}
          </button>
        </div>
      </form>

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
                <td>{roleLabel[item.role]}</td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.is_active ? "status-completed" : "status-cancelled"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>{new Date(item.created_at).toLocaleString("es-PE")}</td>
                <td>
                  <button
                    onClick={() => void toggleActive(item)}
                    className={`admin-btn ${item.is_active ? "admin-btn-danger" : "admin-btn-primary"}`}
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="p-6 text-sm text-[var(--text-muted)]">No hay staff para esta sede.</p>
        )}
        {loading && <p className="p-6 text-sm text-[var(--text-muted)]">Cargando staff...</p>}
      </div>
    </section>
  );
}
