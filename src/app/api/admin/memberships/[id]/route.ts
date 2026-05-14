import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const patchMembershipSchema = z
  .object({
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

function canManageBranch(
  actorRole: "admin" | "client" | null,
  actorMemberships: Array<{ branch_id: string; role: "owner" | "admin" | "barber" }>,
  branchId: string,
) {
  if (actorRole === "admin") return true;
  return actorMemberships.some((m) => m.branch_id === branchId && (m.role === "owner" || m.role === "admin"));
}

function isOwnerInBranch(
  actorRole: "admin" | "client" | null,
  actorMemberships: Array<{ branch_id: string; role: "owner" | "admin" | "barber" }>,
  branchId: string,
) {
  if (actorRole === "admin") return true;
  return actorMemberships.some((m) => m.branch_id === branchId && m.role === "owner");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = patchMembershipSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("memberships")
    .select("id, branch_id, role")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  if (!canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  if (current.role === "owner" && !isOwnerInBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Only owner can modify owner role membership" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("memberships")
    .update(parsed.data)
    .eq("id", id)
    .select("id, user_id, branch_id, role, is_active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

