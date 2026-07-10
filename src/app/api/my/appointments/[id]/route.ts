import { NextResponse } from "next/server";
import { z } from "zod";

import {
  appendAuditNote,
  canConfirmAttendance,
  canDeclineAttendance,
  isFutureAppointment,
  resolveAvailability,
  validateBookingWindow,
} from "@/lib/booking";
import { getAuthContext } from "@/lib/auth/session";
import { normalizeAppointmentForClient } from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const cancelSchema = z.object({
  action: z.literal("cancel"),
  reason: z.string().trim().max(250).optional().nullable(),
});

const confirmAttendanceSchema = z.object({
  action: z.literal("confirm_attendance"),
});

const declineAttendanceSchema = z.object({
  action: z.literal("decline_attendance"),
  reason: z.string().trim().max(250).optional().nullable(),
});

const rescheduleSchema = z.object({
  action: z.literal("reschedule"),
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  service_id: z.uuid(),
  appointment_date: z.iso.date(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

const updateAppointmentSchema = z.union([
  cancelSchema,
  confirmAttendanceSchema,
  declineAttendanceSchema,
  rescheduleSchema,
]);

const APPOINTMENT_SELECT_VARIANTS: string[] = [
  "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at",
  "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
  "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
  "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
];

type AppointmentRow = Record<string, unknown>;

function getAppointmentStartTime(appointment: AppointmentRow) {
  if (typeof appointment.start_time === "string") {
    return appointment.start_time.slice(0, 5);
  }

  if (typeof appointment.appointment_time === "string") {
    return appointment.appointment_time.slice(0, 5);
  }

  return "";
}

function getAppointmentClientColumn(select: string) {
  return select.includes("client_id") ? "client_id" : "profile_id";
}

async function loadClientAppointment(
  appointmentId: string,
  userId: string,
) {
  const supabase = await createClient();
  let appointment: AppointmentRow | null = null;
  let errorMessage: string | null = null;
  let selectUsed: string | null = null;

  for (const select of APPOINTMENT_SELECT_VARIANTS) {
    const clientColumn = getAppointmentClientColumn(select);
    const { data, error } = await supabase
      .from("appointments")
      .select(select)
      .eq("id", appointmentId)
      .eq(clientColumn, userId)
      .maybeSingle();

    if (!error) {
      appointment = data as AppointmentRow | null;
      selectUsed = select;
      errorMessage = null;
      break;
    }

    errorMessage = error.message;
  }

  return { supabase, appointment, errorMessage, selectUsed };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateAppointmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase, appointment, errorMessage, selectUsed } = await loadClientAppointment(id, user.id);

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
  if (!appointment || !selectUsed) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const clientColumn = getAppointmentClientColumn(selectUsed);
  const startTime = getAppointmentStartTime(appointment);
  const attendanceStatus =
    typeof appointment.attendance_status === "string" ? appointment.attendance_status : "pending";

  if (!["pending", "confirmed"].includes(String(appointment.status ?? ""))) {
    return NextResponse.json({ error: "Only pending or confirmed appointments can be modified by the client" }, { status: 400 });
  }
  if (!startTime || !isFutureAppointment(String(appointment.appointment_date ?? ""), startTime)) {
    return NextResponse.json({ error: "This appointment can no longer be modified" }, { status: 400 });
  }

  const actionData = parsed.data;

  if (actionData.action === "confirm_attendance") {
    if (!canConfirmAttendance({
      status: String(appointment.status ?? ""),
      attendanceStatus,
      appointmentDate: String(appointment.appointment_date ?? ""),
      startTime,
    })) {
      return NextResponse.json({ error: "Attendance can no longer be confirmed for this appointment" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        attendance_status: "confirmed",
        attendance_confirmed_at: new Date().toISOString(),
        notes: appendAuditNote(
          typeof appointment.notes === "string" ? appointment.notes : null,
          `[CLIENT_ATTENDANCE_CONFIRMED ${new Date().toISOString()}]`,
        ),
      })
      .eq("id", id)
      .eq(clientColumn, user.id)
      .select(selectUsed)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: normalizeAppointmentForClient(data as unknown as Record<string, unknown>) });
  }

  if (actionData.action === "decline_attendance") {
    if (!canDeclineAttendance({
      status: String(appointment.status ?? ""),
      attendanceStatus,
      appointmentDate: String(appointment.appointment_date ?? ""),
      startTime,
    })) {
      return NextResponse.json({ error: "Attendance can no longer be declined for this appointment" }, { status: 400 });
    }

    const reason = actionData.reason?.trim();
    const noteEntry = reason
      ? `[CLIENT_ATTENDANCE_DECLINED ${new Date().toISOString()}] ${reason}`
      : `[CLIENT_ATTENDANCE_DECLINED ${new Date().toISOString()}]`;

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        attendance_status: "declined",
        release_reason: "client_declined",
        notes: appendAuditNote(typeof appointment.notes === "string" ? appointment.notes : null, noteEntry),
      })
      .eq("id", id)
      .eq(clientColumn, user.id)
      .select(selectUsed)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: normalizeAppointmentForClient(data as unknown as Record<string, unknown>) });
  }

  if (actionData.action === "cancel") {
    const reason = actionData.reason?.trim();
    const noteEntry = reason
      ? `[CLIENT_CANCELLED ${new Date().toISOString()}] ${reason}`
      : `[CLIENT_CANCELLED ${new Date().toISOString()}]`;

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        attendance_status: attendanceStatus === "confirmed" ? "declined" : attendanceStatus,
        release_reason: "client_cancelled",
        notes: appendAuditNote(typeof appointment.notes === "string" ? appointment.notes : null, noteEntry),
      })
      .eq("id", id)
      .eq(clientColumn, user.id)
      .select(selectUsed)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: normalizeAppointmentForClient(data as unknown as Record<string, unknown>) });
  }

  const bookingWindowError = validateBookingWindow(actionData.appointment_date);
  if (bookingWindowError) {
    return NextResponse.json({ error: bookingWindowError }, { status: 400 });
  }

  const availability = await resolveAvailability(supabase, {
    branchId: actionData.branch_id,
    barberId: actionData.barber_id,
    serviceId: actionData.service_id,
    appointmentDate: actionData.appointment_date,
    excludeAppointmentId: String(appointment.id),
  });

  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: availability.status });
  }

  const selectedSlot = availability.slots.find((slot) => slot.start_time === actionData.start_time);
  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected slot is not available" }, { status: 409 });
  }

  const noteEntry = `[CLIENT_RESCHEDULED ${new Date().toISOString()}] ${String(appointment.appointment_date)} ${startTime} -> ${actionData.appointment_date} ${actionData.start_time}`;
  const updatePayload = selectUsed.includes("start_time")
    ? {
        branch_id: actionData.branch_id,
        barber_id: actionData.barber_id,
        service_id: actionData.service_id,
        appointment_date: actionData.appointment_date,
        start_time: actionData.start_time,
        end_time: selectedSlot.end_time,
        status: "pending",
        attendance_status: "pending",
        attendance_confirmed_at: null,
        release_reason: null,
        notes: appendAuditNote(typeof appointment.notes === "string" ? appointment.notes : null, noteEntry),
      }
    : {
        branch_id: actionData.branch_id,
        barber_id: actionData.barber_id,
        service_id: actionData.service_id,
        appointment_date: actionData.appointment_date,
        appointment_time: actionData.start_time,
        status: "pending",
        attendance_status: "pending",
        attendance_confirmed_at: null,
        release_reason: null,
        notes: appendAuditNote(typeof appointment.notes === "string" ? appointment.notes : null, noteEntry),
      };

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", id)
    .eq(clientColumn, user.id)
    .select(selectUsed)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Selected slot is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: normalizeAppointmentForClient(data as unknown as Record<string, unknown>) });
}
