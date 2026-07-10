import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth/session";
import { appendAuditNote } from "@/lib/booking";
import { buildFullName } from "@/lib/schema-compat";
import {
  buildWaitlistRange,
  canJoinWaitlist,
  normalizeWaitlistEntryForClient,
} from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

const createWaitlistSchema = z.object({
  branch_id: z.uuid(),
  service_id: z.uuid(),
  barber_id: z.uuid().optional().nullable(),
  desired_date: z.iso.date(),
  selected_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  desired_start_from: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  desired_start_to: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const WAITLIST_SELECT_VARIANTS: string[] = [
  `
    id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to,
    status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at,
    branch:branches(name), barber:barbers(full_name), service:services(name, price)
  `,
  "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at",
];

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();

  for (const select of WAITLIST_SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select(select)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      return NextResponse.json({
        ok: true,
        items: (data ?? []).map((item) =>
          normalizeWaitlistEntryForClient(item as unknown as Record<string, unknown>),
        ),
      });
    }
  }

  return NextResponse.json({ ok: true, items: [] });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createWaitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!canJoinWaitlist(parsed.data.desired_date)) {
    return NextResponse.json({ error: "The waitlist can only be requested for today or future dates" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, branch_id, duration_minutes, is_active")
    .eq("id", parsed.data.service_id)
    .eq("branch_id", parsed.data.branch_id)
    .maybeSingle();

  if (serviceError) {
    return NextResponse.json({ error: serviceError.message }, { status: 500 });
  }
  if (!service || service.is_active === false) {
    return NextResponse.json({ error: "Service not found or inactive for this branch" }, { status: 400 });
  }

  const waitlistWindow =
    parsed.data.desired_start_from || parsed.data.desired_start_to
      ? {
          desiredStartFrom: parsed.data.desired_start_from ?? null,
          desiredStartTo: parsed.data.desired_start_to ?? null,
        }
      : buildWaitlistRange(parsed.data.selected_start_time ?? null, service.duration_minutes ?? null);

  const noteEntry = appendAuditNote(
    parsed.data.notes ?? null,
    `[WAITLIST_REQUEST ${new Date().toISOString()}] ${buildFullName(profile, user.email ?? "Cliente")} solicitó cupo liberado`,
  );

  for (const select of WAITLIST_SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert({
        client_id: user.id,
        branch_id: parsed.data.branch_id,
        service_id: parsed.data.service_id,
        barber_id: parsed.data.barber_id ?? null,
        desired_date: parsed.data.desired_date,
        desired_start_from: waitlistWindow.desiredStartFrom,
        desired_start_to: waitlistWindow.desiredStartTo,
        status: "active",
        notes: noteEntry,
      })
      .select(select)
      .single();

    if (!error) {
      return NextResponse.json({ ok: true, item: normalizeWaitlistEntryForClient(data as unknown as Record<string, unknown>) }, { status: 201 });
    }
  }

  return NextResponse.json({ error: "The waitlist entry could not be created" }, { status: 500 });
}
