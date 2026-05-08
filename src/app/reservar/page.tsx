"use client";

import { useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

type Barber = {
  id: string;
  full_name: string;
  specialty: string | null;
};

type Slot = {
  start_time: string;
  end_time: string;
};

export default function ReservarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const minDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  const maxDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 60);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      const res = await fetch("/api/booking/catalog");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar catálogo");
        return;
      }
      setServices(json.services ?? []);
      setBarbers(json.barbers ?? []);
      if (json.services?.[0]?.id) setServiceId(json.services[0].id);
      if (json.barbers?.[0]?.id) setBarberId(json.barbers[0].id);
    }

    void loadCatalog();
  }, []);

  async function loadSlots() {
    setError(null);
    setSuccess(null);
    setSlotStart("");

    if (!serviceId || !barberId || !date) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    const res = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: serviceId, barber_id: barberId, appointment_date: date }),
    });

    const json = await res.json().catch(() => ({}));
    setLoadingSlots(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo consultar disponibilidad");
      setSlots([]);
      return;
    }

    setSlots(json.slots ?? []);
  }

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slotStart) {
      setError("Debes seleccionar un horario");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/my/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: date,
        start_time: slotStart,
        notes: notes || null,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la cita");
      return;
    }

    setSuccess("Cita creada correctamente en estado pending");
    setNotes("");
    await loadSlots();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Reservar cita</h1>
      <p className="mt-2 text-sm text-[#5f6b7a]">Selecciona servicio, barbero, fecha y horario disponible.</p>

      <form onSubmit={book} className="mt-6 space-y-4 rounded-lg border bg-white p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-md border px-3 py-2">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - S/ {s.price}
              </option>
            ))}
          </select>

          <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="rounded-md border px-3 py-2">
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-3 py-2"
            required
          />
        </div>

        <button
          type="button"
          onClick={() => void loadSlots()}
          disabled={loadingSlots || !serviceId || !barberId || !date}
          className="rounded-md border px-4 py-2 hover:bg-[#eef3fb] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingSlots ? "Consultando horarios..." : "Consultar horarios"}
        </button>

        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => setSlotStart(slot.start_time)}
              className={`rounded-md border px-3 py-1.5 text-sm ${slotStart === slot.start_time ? "bg-[#0d1b3d] text-white" : "hover:bg-[#eef3fb]"}`}
            >
              {slot.start_time}
            </button>
          ))}
          {!loadingSlots && slots.length === 0 ? <p className="text-sm text-[#5f6b7a]">Sin horarios disponibles</p> : null}
        </div>

        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24 w-full rounded-md border px-3 py-2"
        />

        <div className="rounded-md bg-[#eef3fb] p-3 text-sm text-[#334155]">
          <p>
            Servicio: <strong>{selectedService?.name ?? "-"}</strong>
          </p>
          <p>
            Duración: <strong>{selectedService?.duration_minutes ?? "-"} min</strong>
          </p>
          <p>
            Precio: <strong>S/ {selectedService?.price ?? "-"}</strong>
          </p>
          <p>
            Horario: <strong>{slotStart || "No seleccionado"}</strong>
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <button
          type="submit"
          disabled={loading || !date || !slotStart || !serviceId || !barberId}
          className="rounded-md bg-[#0d1b3d] px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Reservando..." : "Confirmar reserva"}
        </button>
      </form>
    </main>
  );
}
