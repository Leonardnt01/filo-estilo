import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { appendAuditNote } from "@/lib/booking";
import { canRespondToWaitlistOffer, normalizeWaitlistEntryForClient } from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

const WAITLIST_SELECT = "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at";

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
  if (!["active", "offered"].includes(current.status)) {
    return NextResponse.json({ error: "This waitlist entry can no longer be cancelled" }, { status: 400 });
  }

  const nextStatus = canRespondToWaitlistOffer(current) ? "cancelled" : "cancelled";
  const { data, error } = await supabase
    .from("waitlist_entries")
    .update({
      status: nextStatus,
      notes: appendAuditNote(current.notes, `[WAITLIST_CANCELLED ${new Date().toISOString()}] by client`),
    })
    .eq("id", id)
    .eq("client_id", user.id)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: normalizeWaitlistEntryForClient(data as unknown as Record<string, unknown>) });
}
