/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type MyAppointment = {
  id: string;
  customer_name: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
};

export default function MyAppointmentsPage() {
  const [items, setItems] = useState<MyAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/my/appointments");
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar tus citas");
      return;
    }

    setItems(json.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Mis citas</h1>
      <p className="mt-2 text-sm text-[#5f6b7a]">Historial y estado de tus reservas.</p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#eef3fb]">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Hora</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Notas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.appointment_date}</td>
                <td className="p-2">{item.start_time}</td>
                <td className="p-2">{item.status}</td>
                <td className="p-2">{item.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}


