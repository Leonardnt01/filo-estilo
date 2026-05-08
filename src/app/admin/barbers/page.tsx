/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Barber = {
  id: string;
  full_name: string;
  specialty: string | null;
  image_url: string | null;
  is_active: boolean;
};

export default function AdminBarbersPage() {
  const [items, setItems] = useState<Barber[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", specialty: "", image_url: "" });
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  const [editingSpecialtyValue, setEditingSpecialtyValue] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/barbers");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar barberos");
      return;
    }
    setItems(json.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createBarber(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        specialty: form.specialty || null,
        image_url: form.image_url || null,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo crear barbero");
      return;
    }

    setForm({ full_name: "", specialty: "", image_url: "" });
    setSuccess("Barbero creado correctamente");
    await load();
  }

  async function updateSpecialty(id: string, specialty: string) {
    const res = await fetch(`/api/admin/barbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialty }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo actualizar especialidad");
      return;
    }

    setEditingSpecialtyId(null);
    setEditingSpecialtyValue("");
    setSuccess("Especialidad actualizada");
    await load();
  }

  async function deactivate(id: string) {
    const ok = window.confirm("¿Seguro que deseas desactivar este barbero?");
    if (!ok) return;

    const res = await fetch(`/api/admin/barbers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo desactivar barbero");
      return;
    }
    setSuccess("Barbero desactivado");
    await load();
  }

  return (
    <section className="space-y-6">
      <form onSubmit={createBarber} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <input
          placeholder="Nombre completo"
          value={form.full_name}
          onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <input
          placeholder="Especialidad"
          value={form.specialty}
          onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))}
          className="rounded-md border px-3 py-2"
        />
        <input
          placeholder="URL Imagen"
          value={form.image_url}
          onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
          className="rounded-md border px-3 py-2"
        />
        <button className="rounded-md bg-[#0d1b3d] px-4 py-2 text-white md:col-span-3" type="submit">
          Crear barbero
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#eef3fb]">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Especialidad</th>
              <th className="p-2 text-left">Activo</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.full_name}</td>
                <td className="p-2">{item.specialty ?? "-"}</td>
                <td className="p-2">{item.is_active ? "Sí" : "No"}</td>
                <td className="p-2">
                  {editingSpecialtyId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingSpecialtyValue}
                        onChange={(e) => setEditingSpecialtyValue(e.target.value)}
                        className="w-44 rounded border px-2 py-1"
                      />
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => updateSpecialty(item.id, editingSpecialtyValue)}
                      >
                        Guardar
                      </button>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          setEditingSpecialtyId(null);
                          setEditingSpecialtyValue("");
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          setEditingSpecialtyId(item.id);
                          setEditingSpecialtyValue(item.specialty ?? "");
                        }}
                      >
                        Editar especialidad
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => deactivate(item.id)}>
                        Desactivar
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


