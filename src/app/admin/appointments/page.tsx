/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  appointment_date: string;
  start_time: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string | null;
};

const STATUSES: Appointment["status"][] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar citas");
      return;
    }

    setItems(json.items ?? []);
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function changeStatus(id: string, status: Appointment["status"]) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await load();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Filtrar por estado</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#eef3fb]">
            <tr>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Hora</th>
              <th className="p-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.customer_name ?? "-"}</td>
                <td className="p-2">{item.customer_phone ?? "-"}</td>
                <td className="p-2">{item.appointment_date}</td>
                <td className="p-2">{item.start_time}</td>
                <td className="p-2">
                  <select
                    value={item.status}
                    onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                    className="rounded-md border px-2 py-1"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


