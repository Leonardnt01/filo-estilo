/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "" });
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/services");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar servicios");
      setLoading(false);
      return;
    }
    setItems(json.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo crear servicio");
      return;
    }

    setForm({ name: "", description: "", price: "", duration_minutes: "" });
    setSuccess("Servicio creado correctamente");
    await load();
  }

  async function updatePrice(id: string, nextPrice: number) {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(nextPrice) }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo actualizar precio");
      return;
    }

    setEditingPriceId(null);
    setEditingPriceValue("");
    setSuccess("Precio actualizado");
    await load();
  }

  async function deactivate(id: string) {
    const ok = window.confirm("¿Seguro que deseas desactivar este servicio?");
    if (!ok) return;

    const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo desactivar servicio");
      return;
    }
    setSuccess("Servicio desactivado");
    await load();
  }

  return (
    <section className="space-y-6">
      <form onSubmit={createService} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <input
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          className="rounded-md border px-3 py-2"
        />
        <input
          placeholder="Precio"
          type="number"
          min="0"
          value={form.price}
          onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <input
          placeholder="Duración (min)"
          type="number"
          min="1"
          value={form.duration_minutes}
          onChange={(e) => setForm((s) => ({ ...s, duration_minutes: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <button className="rounded-md bg-[#0d1b3d] px-4 py-2 text-white md:col-span-4" type="submit">
          Crear servicio
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
      {loading ? <p className="text-sm">Cargando...</p> : null}

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#eef3fb]">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Duración</th>
              <th className="p-2 text-left">Activo</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.name}</td>
                <td className="p-2">S/ {item.price}</td>
                <td className="p-2">{item.duration_minutes} min</td>
                <td className="p-2">{item.is_active ? "Sí" : "No"}</td>
                <td className="p-2">
                  {editingPriceId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPriceValue}
                        onChange={(e) => setEditingPriceValue(e.target.value)}
                        className="w-28 rounded border px-2 py-1"
                      />
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => updatePrice(item.id, Number(editingPriceValue))}
                      >
                        Guardar
                      </button>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          setEditingPriceId(null);
                          setEditingPriceValue("");
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
                          setEditingPriceId(item.id);
                          setEditingPriceValue(String(item.price));
                        }}
                      >
                        Editar precio
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


