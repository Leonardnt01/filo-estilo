import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAuditNote, canMarkNoShow } from "@/lib/booking";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { offerReleasedSlotToWaitlist, releasedSlotFromAppointment } from "@/lib/waitlist-offers";

const updateAppointmentSchema = z
  .object({
    status: z
      .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
      .optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

function getAppointmentStartTime(appointment: Record<string, unknown>) {
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
  const { role, memberships } = adminCheck;

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
  const { data: current, error: currentError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const currentRow = current as Record<string, unknown>;
  const currentStatus = String(currentRow.status ?? "");
  const nextStatus = parsed.data.status;
  const currentNotes = typeof currentRow.notes === "string" ? currentRow.notes : null;

  // Keep the update robust even if schema differs (missing customer_* fields, etc.).
  const updatePayload: Record<string, unknown> = { ...parsed.data };

  if (nextStatus === "no_show") {
    const startTime = getAppointmentStartTime(currentRow);
    const appointmentDate = String(currentRow.appointment_date ?? "");

    if (
      !startTime ||
      !canMarkNoShow({ status: currentStatus, appointmentDate, startTime })
    ) {
      return NextResponse.json(
        {
          error:
            "Appointment cannot be marked as no_show: it must be an active appointment whose start time already passed",
        },
        { status: 422 },
      );
    }

    updatePayload.release_reason = "no_show";
    updatePayload.notes = appendAuditNote(
      parsed.data.notes !== undefined ? parsed.data.notes ?? null : currentNotes,
      `[ADMIN_NO_SHOW ${new Date().toISOString()}]`,
    );
  }

  if (nextStatus === "cancelled" && currentStatus !== "cancelled") {
    updatePayload.release_reason = "admin_cancelled";
    updatePayload.notes = appendAuditNote(
      parsed.data.notes !== undefined ? parsed.data.notes ?? null : currentNotes,
      `[ADMIN_CANCELLED ${new Date().toISOString()}]`,
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A no_show or admin cancellation frees the slot: offer it to the waitlist.
  // Best-effort: the status change must succeed even if no offer can be made.
  let waitlistOffer: Awaited<ReturnType<typeof offerReleasedSlotToWaitlist>> | null = null;
  const releasesSlot =
    (nextStatus === "no_show" || nextStatus === "cancelled") && currentStatus !== nextStatus;

  if (releasesSlot) {
    const releasedSlot = releasedSlotFromAppointment(data as Record<string, unknown>);
    if (releasedSlot) {
      waitlistOffer = await offerReleasedSlotToWaitlist(releasedSlot);
    }
  }

  return NextResponse.json({ ok: true, item: data, waitlist_offer: waitlistOffer });
}
