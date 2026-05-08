/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Barber = { id: string; full_name: string };
type BusinessHour = {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminBusinessHoursPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [items, setItems] = useState<BusinessHour[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ barber_id: "", day_of_week: "1", start_time: "09:00", end_time: "18:00" });

  async function load() {
    const [barbersRes, hoursRes] = await Promise.all([
      fetch("/api/admin/barbers?only_active=true"),
      fetch("/api/admin/business-hours"),
    ]);

    const barbersJson = await barbersRes.json().catch(() => ({}));
    const hoursJson = await hoursRes.json().catch(() => ({}));

    if (!barbersRes.ok) {
      setError(barbersJson.error ?? "No se pudo cargar barberos");
      return;
    }
    if (!hoursRes.ok) {
      setError(hoursJson.error ?? "No se pudo cargar horarios");
      return;
    }

    const nextBarbers = barbersJson.items ?? [];
    setBarbers(nextBarbers);
    setItems(hoursJson.items ?? []);

    if (!form.barber_id && nextBarbers[0]?.id) {
      setForm((s) => ({ ...s, barber_id: nextBarbers[0].id }));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createHour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/business-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barber_id: form.barber_id,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo crear horario");
      return;
    }

    setSuccess("Horario creado correctamente");
    await load();
  }

  async function removeHour(id: string) {
    const ok = window.confirm("¿Seguro que deseas eliminar este horario?");
    if (!ok) return;

    const res = await fetch(`/api/admin/business-hours/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo eliminar horario");
      return;
    }
    setSuccess("Horario eliminado");
    await load();
  }

  function barberName(id: string) {
    return barbers.find((b) => b.id === id)?.full_name ?? id;
  }

  return (
    <section className="space-y-6">
      <form onSubmit={createHour} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
        <select
          value={form.barber_id}
          onChange={(e) => setForm((s) => ({ ...s, barber_id: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        >
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.full_name}
            </option>
          ))}
        </select>
        <select
          value={form.day_of_week}
          onChange={(e) => setForm((s) => ({ ...s, day_of_week: e.target.value }))}
          className="rounded-md border px-3 py-2"
        >
          {DAY_LABELS.map((label, idx) => (
            <option key={label} value={idx}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={form.start_time}
          onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <input
          type="time"
          value={form.end_time}
          onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))}
          className="rounded-md border px-3 py-2"
          required
        />
        <button className="rounded-md bg-[#0d1b3d] px-4 py-2 text-white md:col-span-4" type="submit">
          Crear horario
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#eef3fb]">
            <tr>
              <th className="p-2 text-left">Barbero</th>
              <th className="p-2 text-left">Día</th>
              <th className="p-2 text-left">Inicio</th>
              <th className="p-2 text-left">Fin</th>
              <th className="p-2 text-left">Activo</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{barberName(item.barber_id)}</td>
                <td className="p-2">{DAY_LABELS[item.day_of_week]}</td>
                <td className="p-2">{item.start_time}</td>
                <td className="p-2">{item.end_time}</td>
                <td className="p-2">{item.is_active ? "Sí" : "No"}</td>
                <td className="p-2">
                  <button className="rounded border px-2 py-1" onClick={() => removeHour(item.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


