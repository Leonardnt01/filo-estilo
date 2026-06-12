import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hhmmString, isStartBeforeEnd } from "@/lib/validators";

const createBusinessHoursSchema = z
  .object({
    branch_id: z.uuid(),
    barber_id: z.uuid(),
    day_of_week: z.number().int().min(0).max(6),
    start_time: hhmmString,
    end_time: hhmmString,
    is_active: z.boolean().optional(),
  })
  .refine((v) => isStartBeforeEnd(v.start_time, v.end_time), {
    message: "start_time must be earlier than end_time",
    path: ["start_time"],
  });

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get("barber_id");
  const branchId = searchParams.get("branch_id");
  const onlyActive = searchParams.get("only_active") === "true";

  if (branchId && !canManageBranch(role, memberships, branchId)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("business_hours")
    .select("id, barber_id, branch_id, day_of_week, start_time, end_time, is_active, created_at, updated_at")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (barberId) {
    query = query.eq("barber_id", barberId);
  }
  if (branchId) {
    query = query.eq("branch_id", branchId);
  } else if (!isGlobalAdmin(role)) {
    const allowedBranchIds = getManageableBranchIds(role, memberships);
    if (!allowedBranchIds || allowedBranchIds.length === 0) {
      return NextResponse.json({ ok: true, count: 0, items: [] });
    }
    query = query.in("branch_id", allowedBranchIds);
  }

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data.length, items: data });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const payload = await request.json().catch(() => null);
  const parsed = createBusinessHoursSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!canManageBranch(role, memberships, parsed.data.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: barberExists, error: barberError } = await supabase
    .from("barbers")
    .select("id")
    .eq("id", parsed.data.barber_id)
    .eq("branch_id", parsed.data.branch_id)
    .maybeSingle();

  if (barberError) {
    return NextResponse.json({ error: barberError.message }, { status: 500 });
  }

  if (!barberExists) {
    return NextResponse.json({ error: "barber_id does not exist" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("business_hours")
    .insert({
      barber_id: parsed.data.barber_id,
      branch_id: parsed.data.branch_id,
      day_of_week: parsed.data.day_of_week,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      is_active: parsed.data.is_active ?? true,
    })
    .select("id, barber_id, day_of_week, start_time, end_time, is_active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
