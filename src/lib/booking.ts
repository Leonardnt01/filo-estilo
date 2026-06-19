import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeAppointmentForClient } from "@/lib/schema-compat";

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const APPOINTMENT_ACTIVE_STATUSES = ["pending", "confirmed", "in_progress"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type ActiveAppointmentStatus = (typeof APPOINTMENT_ACTIVE_STATUSES)[number];

export type Slot = {
  start_time: string;
  end_time: string;
};

type AvailabilityInput = {
  branchId: string;
  barberId: string;
  serviceId: string;
  appointmentDate: string;
  excludeAppointmentId?: string;
};

type AvailabilitySuccess = {
  ok: true;
  durationMinutes: number;
  slots: Slot[];
};

type AvailabilityFailure = {
  ok: false;
  status: number;
  error: string;
};

type AvailabilityResult = AvailabilitySuccess | AvailabilityFailure;

export type BookingSelection = {
  serviceId: string;
  startTime: string;
};

export type BookingCustomer = {
  clientId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
};

type CreateAppointmentsInput = {
  client: BookingCustomer;
  branchId: string;
  barberId: string;
  appointmentDate: string;
  selections: BookingSelection[];
  notes?: string | null;
  initialStatus?: AppointmentStatus;
};

type CreateAppointmentsSuccess = {
  ok: true;
  items: Array<ReturnType<typeof normalizeAppointmentForClient>>;
};

type CreateAppointmentsFailure = {
  ok: false;
  status: number;
  error: string;
};

export type CreateAppointmentsResult = CreateAppointmentsSuccess | CreateAppointmentsFailure;

export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const nextHours = Math.floor(total / 60);
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

export function getBookingWindowBounds() {
  const today = new Date();
  const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const max = new Date(min);
  max.setDate(max.getDate() + 60);

  return {
    minIso: min.toISOString().slice(0, 10),
    maxIso: max.toISOString().slice(0, 10),
  };
}

export function validateBookingWindow(appointmentDate: string) {
  const { minIso, maxIso } = getBookingWindowBounds();

  if (appointmentDate < minIso) {
    return "Appointment date cannot be in the past";
  }

  if (appointmentDate > maxIso) {
    return "Appointment date exceeds booking window (60 days)";
  }

  return null;
}

export function isFutureAppointment(appointmentDate: string, startTime: string) {
  const [year, month, day] = appointmentDate.split("-").map(Number);
  const [hours, minutes] = startTime.slice(0, 5).split(":").map(Number);
  const startAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return startAt.getTime() > Date.now();
}

export function appendAuditNote(currentNotes: string | null, entry: string) {
  return currentNotes ? `${currentNotes} | ${entry}` : entry;
}

export async function createAppointmentsForSelections(
  supabase: SupabaseClient,
  input: CreateAppointmentsInput,
): Promise<CreateAppointmentsResult> {
  const { client, branchId, barberId, appointmentDate, selections, notes, initialStatus = "pending" } = input;

  const modernRows: Array<{
    client_id: string;
    branch_id: string;
    barber_id: string;
    service_id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    notes: string | null;
  }> = [];

  const legacyRows: Array<{
    profile_id: string;
    branch_id: string;
    barber_id: string;
    service_id: string;
    customer_name: string;
    customer_phone: string | null;
    appointment_date: string;
    appointment_time: string;
    people: number;
    payment_method: string;
    payment_status: string;
    status: AppointmentStatus;
    total_price?: number;
    notes: string | null;
  }> = [];

  for (const selection of selections) {
    const availability = await resolveAvailability(supabase, {
      branchId,
      barberId,
      serviceId: selection.serviceId,
      appointmentDate,
    });

    if (!availability.ok) {
      return availability;
    }

    const selectedSlot = availability.slots.find((slot) => slot.start_time === selection.startTime);
    if (!selectedSlot) {
      return { ok: false, status: 409, error: "Selected slot is not available" };
    }

    modernRows.push({
      client_id: client.clientId,
      branch_id: branchId,
      barber_id: barberId,
      service_id: selection.serviceId,
      customer_name: client.customerName,
      customer_phone: client.customerPhone,
      customer_email: client.customerEmail,
      appointment_date: appointmentDate,
      start_time: selection.startTime,
      end_time: selectedSlot.end_time,
      status: initialStatus,
      notes: notes ?? null,
    });

    legacyRows.push({
      profile_id: client.clientId,
      branch_id: branchId,
      barber_id: barberId,
      service_id: selection.serviceId,
      customer_name: client.customerName,
      customer_phone: client.customerPhone,
      appointment_date: appointmentDate,
      appointment_time: selection.startTime,
      people: 1,
      payment_method: "pending",
      payment_status: "pending",
      status: initialStatus,
      notes: notes ?? null,
    });
  }

  const modernRowsWithoutEmail = modernRows.map((row) => {
    const { customer_email: _customerEmail, ...rest } = row;
    return rest;
  });

  const modernRowsMinimal = modernRows.map((row) => {
    const { customer_email: _customerEmail, ...rest } = row;
    return rest;
  });

  const insertAttempts: Array<{ rows: unknown[]; select: string }> = [
    {
      rows: modernRows,
      select: "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    },
    {
      rows: modernRowsWithoutEmail,
      select: "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    },
    {
      rows: modernRowsMinimal,
      select: "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    },
    {
      rows: legacyRows,
      select: "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
    },
  ];

  let insertedData: Record<string, unknown>[] | null = null;
  let insertError: { code?: string; message: string } | null = null;

  for (const attempt of insertAttempts) {
    const { data, error } = await supabase
      .from("appointments")
      .insert(attempt.rows as never)
      .select(attempt.select);

    if (!error) {
      insertedData = (data ?? []) as unknown as Record<string, unknown>[];
      insertError = null;
      break;
    }

    insertError = { code: error.code, message: error.message };
  }

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, status: 409, error: "Selected slot is already taken" };
    }
    return { ok: false, status: 500, error: insertError.message };
  }

  return {
    ok: true,
    items: (insertedData ?? []).map((item) => normalizeAppointmentForClient(item)),
  };
}

export async function resolveAvailability(
  supabase: SupabaseClient,
  input: AvailabilityInput,
): Promise<AvailabilityResult> {
  const { branchId, barberId, serviceId, appointmentDate, excludeAppointmentId } = input;
  const dayOfWeek = new Date(`${appointmentDate}T00:00:00`).getDay();

  const [
    { data: service, error: serviceError },
    { data: hours, error: hoursError },
    { data: barber, error: barberError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, duration_minutes, branch_id")
      .eq("id", serviceId)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("business_hours")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("branch_id", branchId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true),
    supabase
      .from("barbers")
      .select("id")
      .eq("id", barberId)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (serviceError) {
    return { ok: false, status: 500, error: serviceError.message };
  }
  if (hoursError) {
    return { ok: false, status: 500, error: hoursError.message };
  }
  if (barberError) {
    return { ok: false, status: 500, error: barberError.message };
  }
  if (!service) {
    return { ok: false, status: 400, error: "Service not found or inactive" };
  }
  if (!barber) {
    return { ok: false, status: 400, error: "Barber not found or inactive for this branch" };
  }

  const busySelects = ["id, start_time", "id, appointment_time"] as const;
  let busyItems: Array<{ slot: string }> = [];
  let busyError: { message: string } | null = null;

  for (const busySelect of busySelects) {
    let query = supabase
      .from("appointments")
      .select(busySelect)
      .eq("branch_id", branchId)
      .eq("barber_id", barberId)
      .eq("appointment_date", appointmentDate)
      .in("status", [...APPOINTMENT_ACTIVE_STATUSES]);

    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId);
    }

    const res = await query;
    if (!res.error) {
      busyItems = ((res.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        slot:
          typeof item.start_time === "string"
            ? item.start_time.slice(0, 5)
            : typeof item.appointment_time === "string"
            ? item.appointment_time.slice(0, 5)
            : "",
      })).filter((item) => item.slot);
      busyError = null;
      break;
    }

    busyError = { message: res.error.message };
  }

  if (busyError) {
    return { ok: false, status: 500, error: busyError.message };
  }

  const busySet = new Set(busyItems.map((item) => item.slot));
  const slots: Slot[] = [];

  for (const item of hours ?? []) {
    let cursor = item.start_time.slice(0, 5);
    const end = item.end_time.slice(0, 5);

    while (addMinutes(cursor, service.duration_minutes) <= end) {
      if (!busySet.has(cursor)) {
        slots.push({
          start_time: cursor,
          end_time: addMinutes(cursor, service.duration_minutes),
        });
      }

      cursor = addMinutes(cursor, 30);
    }
  }

  return {
    ok: true,
    durationMinutes: service.duration_minutes,
    slots,
  };
}
