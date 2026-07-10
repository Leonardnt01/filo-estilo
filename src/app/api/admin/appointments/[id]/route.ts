import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAuditNote, canMarkNoShow } from "@/lib/booking";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch } from "@/lib/auth/session";
import { normalizeAppointmentForClient } from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const updateAppointmentSchema = z
  .object({
    status: z
      .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
      .optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

const SELECT_VARIANTS: string[] = [
  "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at",
  "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
  "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
  "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
];

type AppointmentRow = Record<string, unknown>;

function getStartTime(appointment: AppointmentRow) {
  if (typeof appointment.start_time === "string") {
    return appointment.start_time.slice(0, 5);
  }

  if (typeof appointment.appointment_time === "string") {
    return appointment.appointment_time.slice(0, 5);
  }

  return "";
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships, user } = adminCheck;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateAppointmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let current: AppointmentRow | null = null;
  let selectUsed: string | null = null;
  let currentErrorMessage: string | null = null;

  for (const select of SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("appointments")
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      current = data as AppointmentRow | null;
      selectUsed = select;
      currentErrorMessage = null;
      break;
    }

    currentErrorMessage = error.message;
  }

  if (currentErrorMessage) {
    return NextResponse.json({ error: currentErrorMessage }, { status: 500 });
  }
  if (!current || !selectUsed) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, String(current.branch_id ?? ""))) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof parsed.data.notes !== "undefined") {
    updatePayload.notes = parsed.data.notes;
  }

  const currentStatus = String(current.status ?? "pending");
  const startTime = getStartTime(current);

  if (parsed.data.status) {
    if (parsed.data.status === "no_show") {
      if (
        !startTime ||
        !canMarkNoShow({
          status: currentStatus,
          appointmentDate: String(current.appointment_date ?? ""),
          startTime,
        })
      ) {
        return NextResponse.json({ error: "This appointment cannot be marked as no_show" }, { status: 400 });
      }

      updatePayload.status = "no_show";
      updatePayload.release_reason = "no_show";
      updatePayload.notes = appendAuditNote(
        typeof updatePayload.notes === "string"
          ? updatePayload.notes
          : typeof current.notes === "string"
          ? current.notes
          : null,
        `[ADMIN_NO_SHOW ${new Date().toISOString()}] by ${user.id}`,
      );
    } else {
      updatePayload.status = parsed.data.status;

      if (parsed.data.status === "cancelled") {
        updatePayload.release_reason = "admin_cancelled";
      }

      if (parsed.data.status === "completed") {
        updatePayload.attendance_status =
          typeof current.attendance_status === "string" && current.attendance_status !== "pending"
            ? current.attendance_status
            : "confirmed";
      }
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", id)
    .select(selectUsed)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: normalizeAppointmentForClient(data as unknown as Record<string, unknown>) });
}
