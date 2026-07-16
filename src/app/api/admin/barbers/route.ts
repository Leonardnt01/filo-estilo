import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "image_url must be a valid URL or data image",
  });

const createBarberSchema = z.object({
  branch_id: z.uuid(),
  full_name: z.string().trim().min(1),
  specialty: z.string().trim().optional().nullable(),
  image_url: imageUrlSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

async function selectBarbersWithCompat(
  branchId: string | null,
  onlyActive: boolean,
  allowedBranchIds: string[] | null,
) {
  const supabase = await createClient();
  const selects = [
    "id, branch_id, full_name, specialty, image_url, is_active, created_at, updated_at",
    "id, branch_id, full_name, specialty, is_active, created_at, updated_at",
  ];

  for (const select of selects) {
    let query = supabase
      .from("barbers")
      .select(select)
      .order("created_at", { ascending: false });

    if (onlyActive) query = query.eq("is_active", true);
    if (branchId) {
      query = query.eq("branch_id", branchId);
    } else if (allowedBranchIds) {
      query = query.in("branch_id", allowedBranchIds);
    }

    const { data, error } = await query;
    if (!error) {
      return {
        data: (data ?? []).map((item) => {
          const row = item as unknown as Record<string, unknown>;
          return {
            ...row,
            image_url: typeof row.image_url === "string" ? row.image_url : null,
          };
        }),
        error: null,
      };
    }
  }

  const { error } = await supabase
    .from("barbers")
    .select("id")
    .limit(1);

  return { data: null, error };
}

async function insertBarberWithCompat(payload: {
  full_name: string;
  branch_id: string;
  specialty: string | null;
  image_url: string | null;
  is_active: boolean;
}) {
  const supabase = await createClient();
  const insertPayload = {
    full_name: payload.full_name,
    branch_id: payload.branch_id,
    specialty: payload.specialty,
    image_url: payload.image_url,
    is_active: payload.is_active,
  };

  const { data, error } = await supabase
    .from("barbers")
    .insert(insertPayload)
    .select("id, full_name, specialty, image_url, is_active, created_at, updated_at")
    .single();

  if (!error) return { data, error: null };

  if (!error.message.toLowerCase().includes("image_url")) {
    return { data: null, error };
  }

  const { image_url: _ignored, ...fallbackPayload } = insertPayload;
  const fallback = await supabase
    .from("barbers")
    .insert(fallbackPayload)
    .select("id, full_name, specialty, is_active, created_at, updated_at")
    .single();

  return {
    data: fallback.data ? { ...fallback.data, image_url: null } : null,
    error: fallback.error,
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("only_active") === "true";
  const branchId = searchParams.get("branch_id");

  if (branchId && !canManageBranch(role, memberships, branchId)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  let allowedBranchIds: string[] | null = null;
  if (!branchId && !isGlobalAdmin(role)) {
    allowedBranchIds = getManageableBranchIds(role, memberships);
    if (!allowedBranchIds || allowedBranchIds.length === 0) {
      return NextResponse.json({ ok: true, count: 0, items: [] });
    }
  }

  const { data, error } = await selectBarbersWithCompat(branchId, onlyActive, allowedBranchIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data?.length ?? 0, items: data ?? [] });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const payload = await request.json().catch(() => null);
  const parsed = createBarberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!canManageBranch(role, memberships, parsed.data.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const { data, error } = await insertBarberWithCompat({
    full_name: parsed.data.full_name,
    branch_id: parsed.data.branch_id,
    specialty: parsed.data.specialty ?? null,
    image_url: parsed.data.image_url ?? null,
    is_active: parsed.data.is_active ?? true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
