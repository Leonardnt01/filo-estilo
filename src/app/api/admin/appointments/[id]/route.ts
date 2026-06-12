import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const updateAppointmentSchema = z
  .object({
    status: z
      .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
      .optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

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
    .select("id, branch_id")
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

  // Keep the update robust even if schema differs (missing customer_* fields, etc.).
  const { data, error } = await supabase
    .from("appointments")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
