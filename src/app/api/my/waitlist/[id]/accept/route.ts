import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { appendAuditNote, createAppointmentsForSelections } from "@/lib/booking";
import { buildFullName } from "@/lib/schema-compat";
import { canRespondToWaitlistOffer, normalizeWaitlistEntryForClient } from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

const WAITLIST_SELECT = "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at";
const SOURCE_APPOINTMENT_SELECTS: string[] = [
  "id, branch_id, barber_id, service_id, appointment_date, start_time, status, notes",
  "id, branch_id, barber_id, service_id, appointment_date, appointment_time, status, notes",
];

function getSourceStartTime(sourceAppointment: Record<string, unknown>) {
  if (typeof sourceAppointment.start_time === "string") {
    return sourceAppointment.start_time.slice(0, 5);
  }

  if (typeof sourceAppointment.appointment_time === "string") {
    return sourceAppointment.appointment_time.slice(0, 5);
  }

  return "";
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("waitlist_entries")
    .select(WAITLIST_SELECT)
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  }
  if (!canRespondToWaitlistOffer(current)) {
    return NextResponse.json({ error: "This waitlist offer is no longer active" }, { status: 400 });
  }
  if (!current.source_appointment_id) {
    return NextResponse.json({ error: "This waitlist offer has no released slot assigned" }, { status: 400 });
  }

  let sourceAppointment: Record<string, unknown> | null = null;
  let sourceErrorMessage: string | null = null;
  for (const select of SOURCE_APPOINTMENT_SELECTS) {
    const { data, error } = await supabase
      .from("appointments")
      .select(select)
      .eq("id", current.source_appointment_id)
      .maybeSingle();

    if (!error) {
      sourceAppointment = data as Record<string, unknown> | null;
      sourceErrorMessage = null;
      break;
    }

    sourceErrorMessage = error.message;
  }

  if (sourceErrorMessage) {
    return NextResponse.json({ error: sourceErrorMessage }, { status: 500 });
  }
  if (!sourceAppointment) {
    return NextResponse.json({ error: "The released slot could not be found anymore" }, { status: 404 });
  }

  const startTime = getSourceStartTime(sourceAppointment);
  if (!startTime) {
    return NextResponse.json({ error: "The released slot does not have a valid start time" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const created = await createAppointmentsForSelections(supabase, {
    client: {
      clientId: user.id,
      customerName: buildFullName(profile, user.email ?? "Cliente"),
      customerPhone: profile && "phone" in profile && typeof profile.phone === "string" ? profile.phone : null,
      customerEmail: user.email ?? null,
    },
    branchId: String(sourceAppointment.branch_id ?? current.branch_id),
    barberId: String(sourceAppointment.barber_id ?? current.barber_id ?? ""),
    appointmentDate: String(sourceAppointment.appointment_date ?? current.desired_date),
    selections: [
      {
        serviceId: String(sourceAppointment.service_id ?? current.service_id),
        startTime,
      },
    ],
    notes: appendAuditNote(
      current.notes,
      `[WAITLIST_ACCEPTED ${new Date().toISOString()}] source:${current.source_appointment_id}`,
    ),
    initialStatus: "pending",
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  const promotedAppointmentId = created.items[0]?.id ?? null;
  const { data, error } = await supabase
    .from("waitlist_entries")
    .update({
      status: "fulfilled",
      promoted_appointment_id: promotedAppointmentId,
      notes: appendAuditNote(current.notes, `[WAITLIST_FULFILLED ${new Date().toISOString()}] appointment:${promotedAppointmentId}`),
    })
    .eq("id", id)
    .eq("client_id", user.id)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: normalizeWaitlistEntryForClient(data as unknown as Record<string, unknown>),
    appointment: created.items[0] ?? null,
  });
}
