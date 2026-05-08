import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    price: z.number().min(0).optional(),
    duration_minutes: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, description, price, duration_minutes, is_active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, name, is_active, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
