import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "image_url must be a valid URL or data image",
  });

const updateBarberSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    specialty: z.string().trim().optional().nullable(),
    image_url: imageUrlSchema.optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

async function updateBarberWithCompat(id: string, payload: Record<string, unknown>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .update(payload)
    .eq("id", id)
    .select("id, full_name, specialty, image_url, is_active, created_at, updated_at")
    .single();

  if (!error) return { data, error: null };

  if (!error.message.toLowerCase().includes("image_url")) {
    return { data: null, error };
  }

  const { image_url: _ignored, ...fallbackPayload } = payload;
  const fallback = await supabase
    .from("barbers")
    .update(fallbackPayload)
    .eq("id", id)
    .select("id, full_name, specialty, is_active, created_at, updated_at")
    .single();

  return {
    data: fallback.data ? { ...fallback.data, image_url: null } : null,
    error: fallback.error,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateBarberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("barbers")
    .select("id, branch_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Barber not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const { data, error } = await updateBarberWithCompat(id, parsed.data);

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
    .from("barbers")
    .select("id, branch_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Barber not found" }, { status: 404 });
  }
  if (!canManageBranch(role, memberships, current.branch_id)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("barbers")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, full_name, is_active, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
