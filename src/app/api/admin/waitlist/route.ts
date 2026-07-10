import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";
import { normalizeWaitlistEntryForClient } from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

const WAITLIST_SELECT_VARIANTS: string[] = [
  `
    id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to,
    status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at,
    branch:branches(name), barber:barbers(full_name), service:services(name, price)
  `,
  "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at",
];

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");
  const serviceId = searchParams.get("service_id");
  const barberId = searchParams.get("barber_id");
  const desiredDate = searchParams.get("desired_date");
  const status = searchParams.get("status");
  const sourceAppointmentId = searchParams.get("source_appointment_id");

  if (branchId && !canManageBranch(role, memberships, branchId)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const supabase = await createClient();

  let effectiveBranchId = branchId;
  let effectiveServiceId = serviceId;
  let effectiveBarberId = barberId;
  let effectiveDesiredDate = desiredDate;

  if (sourceAppointmentId) {
    const { data: sourceAppointment, error: sourceError } = await supabase
      .from("appointments")
      .select("id, branch_id, service_id, barber_id, appointment_date")
      .eq("id", sourceAppointmentId)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 500 });
    }
    if (!sourceAppointment) {
      return NextResponse.json({ error: "Source appointment not found" }, { status: 404 });
    }
    if (!canManageBranch(role, memberships, sourceAppointment.branch_id)) {
      return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
    }

    effectiveBranchId = effectiveBranchId ?? sourceAppointment.branch_id;
    effectiveServiceId = effectiveServiceId ?? sourceAppointment.service_id;
    effectiveBarberId = effectiveBarberId ?? sourceAppointment.barber_id;
    effectiveDesiredDate = effectiveDesiredDate ?? sourceAppointment.appointment_date;
  }

  for (const select of WAITLIST_SELECT_VARIANTS) {
    let query = supabase
      .from("waitlist_entries")
      .select(select)
      .order("created_at", { ascending: true });

    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
    } else if (!isGlobalAdmin(role)) {
      const allowedBranchIds = getManageableBranchIds(role, memberships);
      if (!allowedBranchIds || allowedBranchIds.length === 0) {
        return NextResponse.json({ ok: true, items: [] });
      }
      query = query.in("branch_id", allowedBranchIds);
    }

    if (effectiveServiceId) query = query.eq("service_id", effectiveServiceId);
    if (effectiveDesiredDate) query = query.eq("desired_date", effectiveDesiredDate);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (!error) {
      const normalized = (data ?? []).map((item) =>
        normalizeWaitlistEntryForClient(item as unknown as Record<string, unknown>),
      );

      const filtered = effectiveBarberId
        ? normalized.filter((item) => !item.barber_id || item.barber_id === effectiveBarberId)
        : normalized;

      return NextResponse.json({ ok: true, items: filtered });
    }
  }

  return NextResponse.json({ error: "The waitlist could not be loaded" }, { status: 500 });
}
