import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, isGlobalAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const createMembershipSchema = z.object({
  user_id: z.uuid().optional(),
  email: z.email().optional(),
  branch_id: z.uuid(),
  role: z.enum(["owner", "admin", "barber"]),
  is_active: z.boolean().optional(),
}).refine((v) => !!v.user_id || !!v.email, {
  message: "user_id or email is required",
  path: ["user_id"],
});

function isOwnerInBranch(
  actorRole: "admin" | "client" | null,
  actorMemberships: Array<{ branch_id: string; role: "owner" | "admin" | "barber" }>,
  branchId: string,
) {
  if (actorRole === "admin") return true;
  return actorMemberships.some((m) => m.branch_id === branchId && m.role === "owner");
}

async function resolveUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  // Fast path using auth.users table with service role
  const byTable = await admin
    .schema("auth")
    .from("users")
    .select("id, email")
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  if (!byTable.error && byTable.data?.id) {
    return byTable.data.id as string;
  }

  // Fallback using auth admin API
  const usersPage = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersPage.error) return null;
  const found = usersPage.data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
  return found?.id ?? null;
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { role, memberships } = adminCheck;
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");
  const admin = createAdminClient();

  let allowedBranchIds: string[] = [];
  if (isGlobalAdmin(role)) {
    if (branchId) {
      allowedBranchIds = [branchId];
    } else {
      const { data: allBranches, error: branchesError } = await admin
        .from("branches")
        .select("id")
        .eq("is_active", true);
      if (branchesError) return NextResponse.json({ error: branchesError.message }, { status: 500 });
      allowedBranchIds = (allBranches ?? []).map((b) => b.id as string);
    }
  } else if (branchId) {
    if (!canManageBranch(role, memberships, branchId)) {
      return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
    }
    allowedBranchIds = [branchId];
  } else {
    allowedBranchIds = [...new Set(memberships.filter((m) => m.role === "owner" || m.role === "admin").map((m) => m.branch_id))];
  }

  if (allowedBranchIds.length === 0) return NextResponse.json({ ok: true, items: [] });

  const { data, error } = await admin
    .from("memberships")
    .select("id, user_id, branch_id, role, is_active, created_at, updated_at")
    .in("branch_id", allowedBranchIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const membershipRows = data ?? [];
  const userIds = [...new Set(membershipRows.map((m) => m.user_id).filter(Boolean))];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", userIds);

  let usersById = new Map<string, string | null>();
  try {
    const authUsers = await admin
      .schema("auth")
      .from("users")
      .select("id, email")
      .in("id", userIds);
    if (!authUsers.error) {
      usersById = new Map((authUsers.data ?? []).map((u) => [u.id as string, (u.email as string | null) ?? null]));
    }
  } catch {}

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const enriched = membershipRows.map((m) => {
    const p = profileById.get(m.user_id as string) as { full_name?: string | null; phone?: string | null } | undefined;
    return {
      ...m,
      user_email: usersById.get(m.user_id as string) ?? null,
      full_name: p?.full_name ?? null,
      phone: p?.phone ?? null,
    };
  });

  return NextResponse.json({ ok: true, items: enriched });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const payload = await request.json().catch(() => null);
  const parsed = createMembershipSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { role, memberships } = adminCheck;
  const { branch_id, role: targetRole } = parsed.data;

  if (!canManageBranch(role, memberships, branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  if (targetRole === "owner" && !isOwnerInBranch(role, memberships, branch_id)) {
    return NextResponse.json({ error: "Only owner can assign owner role" }, { status: 403 });
  }

  const admin = createAdminClient();
  const userId = parsed.data.user_id ?? (parsed.data.email ? await resolveUserIdByEmail(parsed.data.email) : null);

  if (!userId) {
    return NextResponse.json(
      { error: "User not found for this email. The user must register first." },
      { status: 404 },
    );
  }

  const { data, error } = await admin
    .from("memberships")
    .upsert(
      {
        user_id: userId,
        branch_id: parsed.data.branch_id,
        role: parsed.data.role,
        is_active: parsed.data.is_active ?? true,
      },
      { onConflict: "user_id,branch_id,role" },
    )
    .select("id, user_id, branch_id, role, is_active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
