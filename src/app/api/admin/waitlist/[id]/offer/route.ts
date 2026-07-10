import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { appendAuditNote, canMarkNoShow } from "@/lib/booking";
import { canManageBranch } from "@/lib/auth/session";
import { getOfferExpiry, normalizeWaitlistEntryForClient } from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

const offerWaitlistSchema = z.object({
  source_appointment_id: z.uuid(),
  expires_in_hours: z.number().int().min(1).max(24).optional(),
});

const WAITLIST_SELECT = "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at";

function getSourceStartTime(sourceAppointment: Record<string, unknown>) {
  if (typeof sourceAppointment.start_time === "string") {
    return sourceAppointment.start_time.slice(0, 5);
  }

  if (typeof sourceAppointment.appointment_time === "string") {
    return sourceAppointment.appointment_time.slice(0, 5);
  }

  return "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships, user } = adminCheck;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = offerWaitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: waitlistEntry, error: waitlistError } = await supabase
    .from("waitlist_entries")
    .select(WAITLIST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (waitlistError) {
    return NextResponse.json({ error: waitlistError.message }, { status: 500 });
  }
  if (!waitlistEntry) {
    return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, waitlistEntry.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }
  if (waitlistEntry.status !== "active") {
    return NextResponse.json({ error: "Only active waitlist entries can receive an offer" }, { status: 400 });
  }

  const sourceSelects: string[] = [
    "id, branch_id, barber_id, service_id, appointment_date, start_time, status, notes",
    "id, branch_id, barber_id, service_id, appointment_date, appointment_time, status, notes",
  ];

  let sourceAppointment: Record<string, unknown> | null = null;
  for (const select of sourceSelects) {
    const { data, error } = await supabase
      .from("appointments")
      .select(select)
      .eq("id", parsed.data.source_appointment_id)
      .maybeSingle();

    if (!error) {
      sourceAppointment = data as Record<string, unknown> | null;
      break;
    }
  }

  if (!sourceAppointment) {
    return NextResponse.json({ error: "Released appointment not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, String(sourceAppointment.branch_id ?? ""))) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }
  if (String(sourceAppointment.branch_id ?? "") !== waitlistEntry.branch_id) {
    return NextResponse.json({ error: "The released slot belongs to another branch" }, { status: 400 });
  }
  if (String(sourceAppointment.service_id ?? "") !== waitlistEntry.service_id) {
    return NextResponse.json({ error: "The released slot does not match the requested service" }, { status: 400 });
  }
  if (String(sourceAppointment.appointment_date ?? "") !== waitlistEntry.desired_date) {
    return NextResponse.json({ error: "The released slot does not match the requested date" }, { status: 400 });
  }
  if (waitlistEntry.barber_id && String(sourceAppointment.barber_id ?? "") !== waitlistEntry.barber_id) {
    return NextResponse.json({ error: "The released slot does not match the requested barber" }, { status: 400 });
  }

  const sourceStatus = String(sourceAppointment.status ?? "");
  const sourceStartTime = getSourceStartTime(sourceAppointment);
  const sourceCanBeReleased =
    sourceStatus === "cancelled" ||
    sourceStatus === "no_show" ||
    (sourceStartTime &&
      canMarkNoShow({
        status: sourceStatus,
        appointmentDate: String(sourceAppointment.appointment_date ?? ""),
        startTime: sourceStartTime,
      }));

  if (!sourceCanBeReleased) {
    return NextResponse.json({ error: "The released slot is not eligible for waitlist promotion yet" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("waitlist_entries")
    .update({
      status: "offered",
      source_appointment_id: parsed.data.source_appointment_id,
      offer_expires_at: getOfferExpiry(parsed.data.expires_in_hours ?? 2),
      notes: appendAuditNote(waitlistEntry.notes, `[WAITLIST_OFFERED ${new Date().toISOString()}] by ${user.id}`),
    })
    .eq("id", id)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: normalizeWaitlistEntryForClient(data as unknown as Record<string, unknown>) });
}
