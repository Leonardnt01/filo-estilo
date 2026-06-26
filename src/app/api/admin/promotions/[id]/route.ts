import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, isGlobalAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "image_url must be a valid URL or data image",
  });

const updatePromotionSchema = z
  .object({
    branch_id: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    discount_percent: z.number().int().min(1).max(100).optional(),
    image_url: imageUrlSchema.optional().nullable(),
    starts_at: z.string().trim().optional().nullable(),
    ends_at: z.string().trim().optional().nullable(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updatePromotionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("promotions")
    .select("id, branch_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  // Verificar permisos sobre la sede actual de la promoción
  if (current.branch_id && !canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }
  if (!current.branch_id && !isGlobalAdmin(role)) {
    return NextResponse.json({ error: "Only global administrators can edit global promotions" }, { status: 403 });
  }

  // Si se está cambiando la sede, verificar permisos sobre la nueva sede
  if (parsed.data.branch_id !== undefined && parsed.data.branch_id !== current.branch_id) {
    if (parsed.data.branch_id && !canManageBranch(role, memberships, parsed.data.branch_id)) {
      return NextResponse.json({ error: "Forbidden for the new branch" }, { status: 403 });
    }
    if (!parsed.data.branch_id && !isGlobalAdmin(role)) {
      return NextResponse.json({ error: "Only global administrators can assign to global branch" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("promotions")
    .update({
      branch_id: parsed.data.branch_id !== undefined ? parsed.data.branch_id : undefined,
      title: parsed.data.title,
      description: parsed.data.description,
      discount_percent: parsed.data.discount_percent,
      image_url: parsed.data.image_url,
      starts_at: parsed.data.starts_at !== undefined ? (parsed.data.starts_at || null) : undefined,
      ends_at: parsed.data.ends_at !== undefined ? (parsed.data.ends_at || null) : undefined,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", id)
    .select("id, branch_id, title, description, discount_percent, image_url, starts_at, ends_at, is_active, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("promotions")
    .select("id, branch_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  // Verificar permisos sobre la sede
  if (current.branch_id && !canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }
  if (!current.branch_id && !isGlobalAdmin(role)) {
    return NextResponse.json({ error: "Only global administrators can delete global promotions" }, { status: 403 });
  }

  // Desactivar en lugar de borrar para mantener integridad histórica de citas
  const { data, error } = await supabase
    .from("promotions")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, title, is_active, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
