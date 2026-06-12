import { NextResponse } from "next/server";
import { z } from "zod";

import { isFutureAppointment, resolveAvailability, validateBookingWindow } from "@/lib/booking";
import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const cancelSchema = z.object({
  action: z.literal("cancel"),
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

const updateAppointmentSchema = z.union([cancelSchema, rescheduleSchema]);

function appendAuditNote(currentNotes: string | null, entry: string) {
  return currentNotes ? `${currentNotes} | ${entry}` : entry;
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

  const supabase = await createClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, client_id, branch_id, barber_id, service_id, appointment_date, start_time, end_time, status, notes")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 500 });
  }
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!["pending", "confirmed"].includes(appointment.status)) {
    return NextResponse.json({ error: "Only pending or confirmed appointments can be modified by the client" }, { status: 400 });
  }
  if (!isFutureAppointment(appointment.appointment_date, appointment.start_time)) {
    return NextResponse.json({ error: "This appointment can no longer be modified" }, { status: 400 });
  }

  const actionData = parsed.data;

  if (actionData.action === "cancel") {
    const cancelData = actionData;
    const reason = cancelData.reason?.trim();
    const noteEntry = reason
      ? `[CLIENT_CANCELLED ${new Date().toISOString()}] ${reason}`
      : `[CLIENT_CANCELLED ${new Date().toISOString()}]`;

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        notes: appendAuditNote(appointment.notes, noteEntry),
      })
      .eq("id", id)
      .eq("client_id", user.id)
      .select("id, appointment_date, start_time, end_time, status, notes")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data });
  }

  const rescheduleData = actionData;
  const bookingWindowError = validateBookingWindow(rescheduleData.appointment_date);
  if (bookingWindowError) {
    return NextResponse.json({ error: bookingWindowError }, { status: 400 });
  }

  const availability = await resolveAvailability(supabase, {
    branchId: rescheduleData.branch_id,
    barberId: rescheduleData.barber_id,
    serviceId: rescheduleData.service_id,
    appointmentDate: rescheduleData.appointment_date,
    excludeAppointmentId: appointment.id,
  });

  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: availability.status });
  }

  const selectedSlot = availability.slots.find((slot) => slot.start_time === rescheduleData.start_time);
  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected slot is not available" }, { status: 409 });
  }

  const noteEntry = `[CLIENT_RESCHEDULED ${new Date().toISOString()}] ${appointment.appointment_date} ${appointment.start_time} -> ${rescheduleData.appointment_date} ${rescheduleData.start_time}`;
  const { data, error } = await supabase
    .from("appointments")
    .update({
      branch_id: rescheduleData.branch_id,
      barber_id: rescheduleData.barber_id,
      service_id: rescheduleData.service_id,
      appointment_date: rescheduleData.appointment_date,
      start_time: rescheduleData.start_time,
      end_time: selectedSlot.end_time,
      status: "pending",
      notes: appendAuditNote(appointment.notes, noteEntry),
    })
    .eq("id", id)
    .eq("client_id", user.id)
    .select("id, branch_id, barber_id, service_id, appointment_date, start_time, end_time, status, notes")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Selected slot is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
