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

const createPromotionSchema = z.object({
  branch_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  discount_percent: z.number().int().min(1).max(100),
  image_url: imageUrlSchema.optional().nullable(),
  starts_at: z.string().trim().optional().nullable(),
  ends_at: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

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

  const supabase = await createClient();
  let query = supabase
    .from("promotions")
    .select("id, branch_id, title, description, discount_percent, image_url, starts_at, ends_at, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  if (branchId) {
    // Si se especifica una sede, mostramos las globales (null) y las específicas de esa sede
    query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
  } else if (allowedBranchIds) {
    query = query.or(`branch_id.in.(${allowedBranchIds.join(",")}),branch_id.is.null`);
  }

  const { data, error } = await query;

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
  const parsed = createPromotionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Si tiene branch_id, verificar permisos sobre esa sede
  if (parsed.data.branch_id && !canManageBranch(role, memberships, parsed.data.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  // Si no tiene branch_id (global) pero el usuario no es admin global, denegar
  if (!parsed.data.branch_id && !isGlobalAdmin(role)) {
    return NextResponse.json({ error: "Only global administrators can create global promotions" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      branch_id: parsed.data.branch_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      discount_percent: parsed.data.discount_percent,
      image_url: parsed.data.image_url ?? null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
      is_active: parsed.data.is_active ?? true,
      sort_order: parsed.data.sort_order ?? 1,
    })
    .select("id, branch_id, title, description, discount_percent, image_url, starts_at, ends_at, is_active, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
