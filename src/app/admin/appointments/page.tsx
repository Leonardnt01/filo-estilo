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
  barber_id?: string;
  service_id?: string;
};

type OptionItem = { id: string; full_name?: string; name?: string };

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
  const [barbers, setBarbers] = useState<OptionItem[]>([]);
  const [services, setServices] = useState<OptionItem[]>([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState("20");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadOptions() {
    const [barbersRes, servicesRes] = await Promise.all([
      fetch("/api/admin/barbers"),
      fetch("/api/admin/services"),
    ]);

    const barbersJson = await barbersRes.json().catch(() => ({}));
    const servicesJson = await servicesRes.json().catch(() => ({}));

    if (barbersRes.ok) setBarbers(barbersJson.items ?? []);
    if (servicesRes.ok) setServices(servicesJson.items ?? []);
  }

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (barberFilter) params.set("barber_id", barberFilter);
    if (serviceFilter) params.set("service_id", serviceFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (limit) params.set("limit", limit);

    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar citas");
      return;
    }

    setItems(json.items ?? []);
  }

  useEffect(() => {
    void loadOptions();
    void load();
  }, []);

  async function applyFilters() {
    setError(null);
    setSuccess(null);
    await load();
  }

  async function clearFilters() {
    setStatusFilter("");
    setBarberFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
    setLimit("20");
    setError(null);
    setSuccess(null);
    setTimeout(() => {
      void load();
    }, 0);
  }

  async function changeStatus(id: string, status: Appointment["status"]) {
    setSavingId(id);
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavingId(null);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo cambiar estado");
      return;
    }
    setSuccess("Estado actualizado");

    await load();
  }

  function statusBadgeClass(status: Appointment["status"]) {
    if (status === "pending") return "bg-amber-100 text-amber-800";
    if (status === "confirmed") return "bg-blue-100 text-blue-800";
    if (status === "in_progress") return "bg-purple-100 text-purple-800";
    if (status === "completed") return "bg-green-100 text-green-800";
    if (status === "cancelled") return "bg-rose-100 text-rose-800";
    return "bg-zinc-200 text-zinc-700";
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Estado: todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Barbero: todos</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.full_name}
            </option>
          ))}
        </select>

        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Servicio: todos</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
        <select value={limit} onChange={(e) => setLimit(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>

        <button onClick={() => void applyFilters()} className="rounded-md bg-[#0d1b3d] px-3 py-2 text-sm text-white">
          Aplicar filtros
        </button>
        <button onClick={() => void clearFilters()} className="rounded-md border px-3 py-2 text-sm">
          Limpiar
        </button>
      </div>

      <p className="text-xs text-[#5f6b7a]">Resultados visibles: {items.length}</p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

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
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                    <select
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(e) => void changeStatus(item.id, e.target.value as Appointment["status"])}
                      className="rounded-md border px-2 py-1"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
